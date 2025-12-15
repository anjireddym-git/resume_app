import { db } from '../lib/firebase';
import { collection, doc, getDocs, updateDoc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import geminiService from './geminiService';

export const updateAllResumesWithExperience = async (groupId, userId, newExperienceData, progressCallback) => {
  try {
    // 1. Update Group Shared Data
    progressCallback({ status: 'updating_group', message: 'Updating shared group data...', progress: 0 });
    
    const groupRef = doc(db, 'resumeGroups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');
    
    // Verify ownership
    if (groupSnap.data().userId !== userId) {
        throw new Error('Unauthorized: You do not own this group');
    }
    
    const groupData = groupSnap.data();
    const currentSharedExperience = groupData.sharedData?.experience || [];
    
    // Add new experience to shared data (without highlights, just structure)
    const sharedExperienceEntry = {
      company: newExperienceData.company,
      location: newExperienceData.location,
      startDate: newExperienceData.startDate,
      endDate: newExperienceData.endDate,
    };
    
    const updatedSharedExperience = [...currentSharedExperience, sharedExperienceEntry];
    
    await updateDoc(groupRef, {
      'sharedData.experience': updatedSharedExperience,
      updatedAt: serverTimestamp()
    });

    // 2. Fetch all resumes in the group
    progressCallback({ status: 'fetching_resumes', message: 'Fetching resumes...', progress: 10 });
    
    const resumesQuery = query(
        collection(db, 'resumes'), 
        where('groupId', '==', groupId),
        where('userId', '==', userId) // Added userId constraint
    );
    const resumesSnapshot = await getDocs(resumesQuery);
    const resumes = resumesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const totalResumes = resumes.length;
    let completed = 0;

    // 3. Process each resume in parallel
    const updatePromises = resumes.map(async (resume) => {
      try {
        // Construct context for AI
        const context = {
            headline: resume.personalInfo?.title || resume.customData?.personalInfo?.title,
            summary: resume.customData?.summary || '',
            skills: Object.keys(resume.customData?.skills || {}).flatMap(k => resume.customData.skills[k]), // Flatten skills
            jobTitles: (resume.customData?.experience || []).map(e => e.position).filter(Boolean)
        };

        // Call AI to refactor highlights
        const refactoredHighlights = await geminiService.generateRefactoredHighlights(context, newExperienceData.highlights);
        
        // Prepare new experience entry for resume customData
        const currentCustomExperience = resume.customData?.experience || [];
        
        const newCustomExperienceEntry = {
            position: newExperienceData.role,
            highlights: refactoredHighlights
        };
        
        const updatedCustomExperience = [...currentCustomExperience, newCustomExperienceEntry];
        
        // Update Resume
        const resumeRef = doc(db, 'resumes', resume.id);
        await updateDoc(resumeRef, {
            'customData.experience': updatedCustomExperience,
            updatedAt: serverTimestamp()
        });
        
        completed++;
        progressCallback({ 
            status: 'processing', 
            message: `Updated resume: ${resume.name}`, 
            progress: 10 + Math.floor((completed / totalResumes) * 90) 
        });
        
      } catch (err) {
        console.error(`Failed to update resume ${resume.id}:`, err);
        // We continue even if one fails
      }
    });

    await Promise.all(updatePromises);
    
    progressCallback({ status: 'complete', message: 'All resumes updated successfully!', progress: 100 });
    
  } catch (error) {
    console.error('Error in batch update:', error);
    progressCallback({ status: 'error', message: error.message, progress: 0 });
    throw error;
  }
};
