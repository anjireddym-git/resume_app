// Default resume data structure based on the provided resume
export const defaultResumeData = {
    personalInfo: {
        name: "ELON MUSK",
        title: "Technology Entrepreneur & Engineer",
        email: "elon@tesla.com",
        phone: "(555) 123-4567",
        location: "Austin, TX",
        linkedin: "linkedin.com/in/elonmusk",
        github: "github.com/elonmusk"
    },
    summary: "Visionary entrepreneur and engineer with expertise in aerospace, electric vehicles, and sustainable energy. Founder and CEO of multiple groundbreaking companies focused on advancing human civilization through technology and innovation.",
    experience: [
        {
            company: "Tesla, Inc.",
            position: "CEO & Product Architect",
            location: "Austin, TX",
            startDate: "Oct 2008",
            endDate: "Present",
            highlights: [
                "Led Tesla to become world's most valuable automaker with $800B+ market cap",
                "Pioneered mass-market electric vehicles and autonomous driving technology",
                "Scaled production from prototype to millions of vehicles annually",
                "Revolutionized energy storage solutions with Powerwall and Megapack"
            ]
        },
        {
            company: "SpaceX",
            position: "CEO & Chief Engineer",
            location: "Hawthorne, CA",
            startDate: "May 2002",
            endDate: "Present",
            highlights: [
                "Developed reusable rocket technology reducing launch costs by 90%",
                "First private company to send astronauts to International Space Station",
                "Designed Starship for Mars colonization missions",
                "Built Starlink satellite constellation providing global internet coverage"
            ]
        },
        {
            company: "PayPal",
            position: "Co-founder & CEO (X.com)",
            location: "San Jose, CA",
            startDate: "Mar 1999",
            endDate: "Oct 2002",
            highlights: [
                "Co-founded X.com which merged to become PayPal",
                "Scaled platform to millions of users and billions in transactions",
                "Led company through IPO and $1.5B acquisition by eBay",
                "Revolutionized online payment systems"
            ]
        }
    ],
    education: [
        {
            institution: "University of Pennsylvania",
            degree: "Bachelor of Science in Physics",
            location: "Philadelphia, PA",
            graduationDate: "May 1997",
            gpa: "3.9/4.0",
            highlights: [
                "Dual degree in Economics from Wharton School",
                "Focused on energy physics and material science"
            ]
        }
    ],
    skills: {
        languages: ["Python", "C++", "JavaScript", "Assembly"],
        frameworks: ["TensorFlow", "PyTorch", "React", "Node.js"],
        tools: ["CAD Software", "Rocket Design Tools", "Manufacturing Systems", "AI/ML Tools"],
        databases: ["PostgreSQL", "Custom Distributed Systems", "Time-Series Databases"]
    },
    projects: [
        {
            name: "Neuralink",
            description: "Brain-computer interface technology for medical applications",
            technologies: ["Neuroscience", "Robotics", "AI", "Medical Devices"],
            highlights: [
                "Developed ultra-high bandwidth brain-machine interfaces",
                "Created surgical robot for precise electrode implantation"
            ]
        },
        {
            name: "The Boring Company",
            description: "Infrastructure and tunnel construction company",
            technologies: ["Tunnel Boring", "Electric Vehicles", "Transportation Systems"],
            highlights: [
                "Reduced tunneling costs by 10x through innovative approaches",
                "Built Las Vegas Convention Center Loop system"
            ]
        }
    ],
    certifications: [
        {
            name: "FAA Commercial Pilot License",
            issuer: "Federal Aviation Administration",
            date: "2010"
        }
    ]
};

// Function to create empty resume structure
export const createEmptyResume = () => ({
    personalInfo: {
        name: "",
        title: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: ""
    },
    summary: "",
    experience: [],
    education: [],
    skills: {
        languages: [],
        frameworks: [],
        tools: [],
        databases: []
    },
    projects: [],
    certifications: []
});
