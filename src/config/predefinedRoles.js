/**
 * Predefined roles for auto-populate resumes feature.
 * Each role has a title, icon, and prompt for AI transformation.
 * 
 * PROMPT GUIDELINES:
 * - Prompts instruct AI to EXPAND content, not reduce
 * - Include ATS-friendly keywords and industry terminology
 * - Focus on quantifiable achievements and action verbs
 * - Maintain all original experience while enhancing relevance
 */

const BASE_INSTRUCTIONS = `
CRITICAL INSTRUCTIONS:
1. EXPAND and ENHANCE all bullet points - never reduce or remove content from the original resume.
2. Each experience entry must have same number as base resume bullet points with quantifiable achievements (%, $, numbers).
3. Start every bullet with strong action verbs: Developed, Architected, Implemented, Optimized, Designed, Led, Automated, Reduced, Increased, Delivered, Spearheaded, Engineered.
4. Include specific technologies, tools, and frameworks as ATS-parseable keywords.
5. Add metrics and impact: "Reduced latency by 40%", "Processed 1M+ requests/day", "Improved efficiency by 25%".
6. Preserve ALL original experiences, projects, and skills while tailoring language to the target role.
7. Use industry-standard terminology that ATS systems recognize.
8. Format skills as a comma-separated list of individual technologies for maximum ATS parsing.
`;

export const PREDEFINED_ROLES = [
  {
    id: 'backend-aws',
    title: 'Backend Engineer (AWS)',
    icon: '☁️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Backend Engineer with AWS expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
AWS Lambda, Amazon ECS, Amazon RDS, Amazon S3, DynamoDB, API Gateway, CloudFormation, CloudWatch, SNS, SQS, EventBridge, IAM, VPC, EC2, Elastic Beanstalk, Aurora, ElastiCache, Kinesis, Step Functions.

TECHNICAL FOCUS:
- Microservices architecture and distributed systems design
- RESTful API development and GraphQL implementation
- Serverless computing and event-driven architecture
- Database design (SQL/NoSQL), query optimization, and data modeling
- Authentication/Authorization (OAuth, JWT, Cognito)
- Performance optimization, caching strategies, and scalability
- Infrastructure as Code (Terraform, CloudFormation, CDK)
- CI/CD pipelines and automated testing

ENHANCE BULLETS TO SHOW:
- Scale metrics (requests/sec, data volume, user count)
- Cost optimization achievements (reduced AWS spend by X%)
- Latency improvements and performance gains
- System reliability and uptime percentages
- Team leadership and cross-functional collaboration`,
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    icon: '🤖',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Machine Learning Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Machine Learning, Deep Learning, PyTorch, TensorFlow, Keras, scikit-learn, XGBoost, LightGBM, Neural Networks, NLP, Computer Vision, Transformers, BERT, GPT, LLM, Hugging Face, MLflow, Kubeflow, Feature Engineering, Model Training, Hyperparameter Tuning, A/B Testing, Python, NumPy, Pandas, Jupyter, CUDA, GPU Computing.

TECHNICAL FOCUS:
- End-to-end ML pipeline development and production deployment
- Model architecture design, training, and optimization
- Feature engineering and data preprocessing at scale
- Model evaluation metrics, validation strategies, and A/B testing
- Deep learning (CNN, RNN, LSTM, Transformers, Attention mechanisms)
- NLP/NLU applications (text classification, NER, sentiment analysis, embeddings)
- Computer Vision (object detection, image segmentation, OCR)
- Large Language Models and Generative AI applications

ENHANCE BULLETS TO SHOW:
- Model performance improvements (accuracy, F1, AUC gains)
- Training efficiency (reduced training time by X%)
- Production impact (inference latency, throughput)
- Dataset sizes and processing volumes
- Business impact (revenue increase, cost savings, user engagement)`,
  },
  {
    id: 'mlops',
    title: 'MLOps Engineer',
    icon: '⚙️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: MLOps Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
MLOps, MLflow, Kubeflow, DVC, Weights & Biases, SageMaker, Vertex AI, Azure ML, Docker, Kubernetes, Helm, ArgoCD, Jenkins, GitHub Actions, GitLab CI, Terraform, Ansible, Prometheus, Grafana, Feature Store, Model Registry, Model Monitoring, Data Drift, Concept Drift, A/B Testing, Canary Deployment, Blue-Green Deployment.

TECHNICAL FOCUS:
- ML pipeline automation and orchestration (Kubeflow, Airflow, Prefect)
- Model versioning, experiment tracking, and reproducibility
- Containerization and orchestration for ML workloads
- Feature stores and data pipeline management
- Model serving infrastructure (TensorFlow Serving, TorchServe, Triton)
- Model monitoring, drift detection, and automated retraining
- Infrastructure as Code for ML environments
- CI/CD for machine learning (CT - Continuous Training)

ENHANCE BULLETS TO SHOW:
- Deployment frequency improvements (from monthly to daily)
- Model serving latency and throughput metrics
- Infrastructure cost optimization
- Time-to-production reduction percentages
- System reliability and model freshness SLAs`,
  },
  {
    id: 'devops',
    title: 'DevOps Engineer',
    icon: '🔧',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: DevOps Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
DevOps, CI/CD, Jenkins, GitHub Actions, GitLab CI, CircleCI, ArgoCD, Docker, Kubernetes, Helm, Terraform, Ansible, Pulumi, AWS, Azure, GCP, Linux, Bash, Python, Prometheus, Grafana, ELK Stack, Datadog, New Relic, PagerDuty, Infrastructure as Code, Configuration Management, Container Orchestration, Service Mesh, Istio, Envoy.

TECHNICAL FOCUS:
- CI/CD pipeline design, implementation, and optimization
- Infrastructure as Code (Terraform, CloudFormation, Pulumi)
- Container orchestration (Kubernetes, ECS, Docker Swarm)
- Cloud platform architecture (AWS, Azure, GCP - multi-cloud)
- Monitoring, alerting, and observability stack implementation
- Security automation (DevSecOps, vulnerability scanning, secrets management)
- Configuration management and environment consistency
- Disaster recovery, backup strategies, and high availability

ENHANCE BULLETS TO SHOW:
- Deployment frequency improvements (deployments per day/week)
- MTTR (Mean Time to Recovery) reduction percentages
- Infrastructure cost optimization savings
- Build time improvements and automation coverage
- Uptime/availability achievements (99.9%+ SLAs)`,
  },
  {
    id: 'rust-azure',
    title: 'Rust Developer (Azure)',
    icon: '🦀',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Rust Developer with Azure Cloud expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Rust, Systems Programming, Memory Safety, Async/Await, Tokio, Actix, Hyper, Serde, Cargo, WebAssembly, WASM, Azure Functions, Azure Cosmos DB, Azure Kubernetes Service, Azure DevOps, Azure Event Hubs, Azure Service Bus, Azure Blob Storage, Concurrency, Multi-threading, Performance Optimization, Zero-Cost Abstractions, FFI, C/C++ Interop.

TECHNICAL FOCUS:
- High-performance systems development with Rust
- Memory-safe concurrent and parallel programming
- Async runtime development (Tokio, async-std)
- Azure cloud-native application development
- WebAssembly compilation and browser/edge computing
- CLI tool development and cross-platform builds
- Performance profiling, optimization, and benchmarking
- FFI and integration with existing C/C++ codebases

ENHANCE BULLETS TO SHOW:
- Performance improvements (latency, throughput, memory usage)
- Safety achievements (eliminated memory bugs, reduced crashes)
- Concurrency handling (threads, connections, parallel tasks)
- Cross-platform deployment success
- Code quality metrics (compile-time guarantees, test coverage)`,
  },
  {
    id: 'frontend-react',
    title: 'Frontend Engineer (React)',
    icon: '⚛️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Frontend Engineer specializing in React.

REQUIRED ATS KEYWORDS TO INCORPORATE:
React, React Hooks, Redux, Redux Toolkit, Zustand, Recoil, Context API, TypeScript, JavaScript, ES6+, Next.js, Gatsby, Webpack, Vite, Babel, Jest, React Testing Library, Cypress, Playwright, CSS, SASS, Tailwind CSS, Styled Components, Material UI, Chakra UI, Storybook, Figma, Accessibility, WCAG, Responsive Design, PWA, Web Performance, Core Web Vitals, SEO.

TECHNICAL FOCUS:
- React application architecture and component design patterns
- State management solutions (Redux, Zustand, React Query)
- TypeScript for type-safe React development
- Performance optimization (code splitting, lazy loading, memoization)
- Testing strategies (unit, integration, E2E)
- Design system and component library development
- Accessibility (WCAG 2.1 AA compliance, screen readers, keyboard navigation)
- Modern CSS and responsive design implementation

ENHANCE BULLETS TO SHOW:
- Performance improvements (Lighthouse scores, Core Web Vitals)
- User engagement metrics (conversion rates, bounce rate reduction)
- Accessibility compliance achievements
- Component reusability and design system adoption rates
- Bundle size optimization percentages`,
  },
  {
    id: 'fullstack',
    title: 'Full Stack Engineer',
    icon: '🔄',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Full Stack Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Full Stack, React, Vue, Angular, Node.js, Express, NestJS, Python, Django, FastAPI, Go, Golang, PostgreSQL, MySQL, MongoDB, Redis, GraphQL, REST API, TypeScript, JavaScript, Docker, Kubernetes, AWS, Azure, GCP, CI/CD, Git, Agile, Scrum, Microservices, Serverless, Authentication, OAuth, JWT, WebSockets, Real-time Applications.

TECHNICAL FOCUS:
- End-to-end feature development from database to UI
- Frontend frameworks (React, Vue, Angular) with modern patterns
- Backend API development (Node.js, Python, Go)
- Database design, optimization, and migrations (SQL/NoSQL)
- Authentication and authorization systems
- Cloud deployment and infrastructure management
- API design (REST, GraphQL) and documentation
- Full ownership of features from conception to production

ENHANCE BULLETS TO SHOW:
- Features delivered end-to-end with business impact
- System scale (users, transactions, data volume)
- Performance improvements across the stack
- Cross-functional collaboration achievements
- Technical debt reduction and code quality improvements`,
  },
  {
    id: 'data-engineer',
    title: 'Data Engineer',
    icon: '📊',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Data Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Data Engineering, ETL, ELT, Data Pipeline, Apache Spark, PySpark, Apache Kafka, Apache Airflow, Prefect, Dagster, dbt, Snowflake, BigQuery, Redshift, Databricks, Delta Lake, Apache Iceberg, Data Warehouse, Data Lake, Data Lakehouse, SQL, Python, Scala, Data Modeling, Star Schema, Dimensional Modeling, Data Quality, Data Governance, CDC, Stream Processing, Batch Processing.

TECHNICAL FOCUS:
- Scalable data pipeline design and implementation
- Real-time and batch data processing architectures
- Data warehouse and data lake design patterns
- ETL/ELT development with modern tools (dbt, Airflow, Spark)
- Stream processing (Kafka, Kinesis, Flink)
- Data quality frameworks and monitoring
- Data modeling (dimensional, normalized, denormalized)
- Cost optimization for cloud data platforms

ENHANCE BULLETS TO SHOW:
- Data volume processed (TB/PB, events/second)
- Pipeline reliability (uptime, SLAs met)
- Processing time improvements and cost savings
- Data freshness and latency achievements
- Business intelligence and analytics enablement impact`,
  },
  {
    id: 'platform-engineer',
    title: 'Platform Engineer',
    icon: '🏗️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Platform Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Platform Engineering, Internal Developer Platform, IDP, Kubernetes, Docker, Helm, ArgoCD, Backstage, Terraform, Pulumi, Service Mesh, Istio, Linkerd, API Gateway, Kong, Developer Experience, DevEx, Self-Service, Golden Paths, Platform as a Product, SRE, GitOps, Infrastructure as Code, Cloud Native, CNCF, Observability, FinOps.

TECHNICAL FOCUS:
- Internal developer platform design and implementation
- Self-service infrastructure and golden path development
- Kubernetes platform management and optimization
- Service mesh and API gateway implementation
- Developer experience tooling and automation
- Platform observability and cost management
- Security and compliance automation
- Platform as a product mindset and stakeholder management

ENHANCE BULLETS TO SHOW:
- Developer productivity improvements (time saved, adoption rates)
- Platform reliability and availability metrics
- Self-service adoption percentages
- Infrastructure cost optimization
- Time-to-production reduction for development teams`,
  },
  {
    id: 'sre',
    title: 'Site Reliability Engineer',
    icon: '🚨',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Site Reliability Engineer (SRE).

REQUIRED ATS KEYWORDS TO INCORPORATE:
Site Reliability Engineering, SRE, SLO, SLI, SLA, Error Budget, Incident Management, On-Call, Postmortem, Blameless Culture, Observability, Monitoring, Alerting, Prometheus, Grafana, Datadog, PagerDuty, Opsgenie, Chaos Engineering, Capacity Planning, Performance Tuning, Reliability, Scalability, High Availability, Disaster Recovery, Runbooks, Automation, Toil Reduction.

TECHNICAL FOCUS:
- SLO/SLI definition, implementation, and error budget management
- Incident response, management, and blameless postmortems
- Observability stack implementation (metrics, logs, traces)
- Chaos engineering and resilience testing
- Capacity planning and performance optimization
- Automation and toil reduction initiatives
- Disaster recovery and business continuity planning
- On-call processes and escalation procedures

ENHANCE BULLETS TO SHOW:
- Availability improvements (99.9% → 99.99%)
- MTTR/MTTD reduction percentages
- Incident frequency reduction
- Toil reduction hours/percentages
- Capacity and cost optimization achievements`,
  },
  // ============ AI/ML ROLES ============
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    icon: '🧠',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: AI Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Artificial Intelligence, AI, Large Language Models, LLM, GPT, Claude, LLaMA, Generative AI, GenAI, Prompt Engineering, RAG, Retrieval Augmented Generation, LangChain, LlamaIndex, Vector Databases, Pinecone, Weaviate, ChromaDB, Embeddings, Fine-tuning, RLHF, OpenAI API, Anthropic, Hugging Face, Transformers, AI Agents, AutoGPT, Function Calling, Semantic Search, AI Safety.

TECHNICAL FOCUS:
- LLM application development and integration
- RAG system architecture and implementation
- Prompt engineering and optimization strategies
- Vector database design and similarity search
- Fine-tuning and model customization
- AI agent development and orchestration
- Responsible AI and safety considerations
- Production AI system deployment and monitoring

ENHANCE BULLETS TO SHOW:
- Response quality improvements (accuracy, relevance scores)
- Latency and cost optimization for AI systems
- User engagement with AI features
- Token efficiency and cost reduction
- Successful AI product launches and adoption metrics`,
  },
  {
    id: 'nlp-engineer',
    title: 'NLP Engineer',
    icon: '💬',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Natural Language Processing (NLP) Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
NLP, Natural Language Processing, Natural Language Understanding, NLU, Text Classification, Named Entity Recognition, NER, Sentiment Analysis, Topic Modeling, Text Summarization, Machine Translation, Question Answering, Chatbots, Conversational AI, BERT, GPT, T5, RoBERTa, SpaCy, NLTK, Hugging Face Transformers, Word Embeddings, Word2Vec, GloVe, FastText, Tokenization, Part-of-Speech Tagging, Dependency Parsing.

TECHNICAL FOCUS:
- Text preprocessing and feature extraction pipelines
- Transformer-based model fine-tuning and deployment
- Named entity recognition and information extraction
- Sentiment analysis and opinion mining systems
- Conversational AI and dialog systems
- Multilingual NLP and cross-lingual transfer
- Text generation and summarization
- Semantic search and document understanding

ENHANCE BULLETS TO SHOW:
- Model accuracy improvements (F1, precision, recall)
- Processing throughput (documents/second)
- Language coverage expansion
- User satisfaction metrics for NLP features
- Cost savings from automation`,
  },
  {
    id: 'computer-vision',
    title: 'Computer Vision Engineer',
    icon: '👁️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Computer Vision Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Computer Vision, Image Processing, Object Detection, Image Segmentation, Image Classification, YOLO, Faster R-CNN, ResNet, EfficientNet, Vision Transformer, ViT, OpenCV, PIL, Pillow, TensorFlow, PyTorch, CUDA, cuDNN, Video Analytics, OCR, Optical Character Recognition, Face Recognition, Pose Estimation, 3D Vision, Point Cloud, Depth Estimation, Autonomous Vehicles, Medical Imaging.

TECHNICAL FOCUS:
- Object detection and tracking systems
- Image segmentation (semantic, instance, panoptic)
- Video analysis and real-time processing
- OCR and document understanding pipelines
- Face detection, recognition, and verification
- Edge deployment and model optimization
- 3D vision and depth estimation
- Medical imaging and specialized domain applications

ENHANCE BULLETS TO SHOW:
- Detection/classification accuracy (mAP, IoU)
- Processing speed (FPS, latency)
- Model size optimization for edge deployment
- False positive/negative rate reductions
- Production system scale (images/day processed)`,
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    icon: '🔬',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Data Scientist.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Data Science, Machine Learning, Statistical Analysis, Python, R, SQL, Pandas, NumPy, Scikit-learn, XGBoost, LightGBM, CatBoost, A/B Testing, Hypothesis Testing, Regression Analysis, Classification, Clustering, Time Series Analysis, Forecasting, Feature Engineering, Exploratory Data Analysis, EDA, Jupyter Notebook, Data Visualization, Matplotlib, Seaborn, Plotly, Tableau, Power BI, Causal Inference.

TECHNICAL FOCUS:
- Statistical modeling and hypothesis testing
- Machine learning model development and validation
- A/B testing design and analysis
- Predictive modeling and forecasting
- Feature engineering and selection
- Data visualization and storytelling
- Causal inference and experimentation
- Cross-functional collaboration with product and engineering

ENHANCE BULLETS TO SHOW:
- Model lift and business impact metrics
- Revenue/cost impact from predictions
- A/B test wins and conversion improvements
- Prediction accuracy improvements
- Stakeholder adoption of data products`,
  },
  // ============ CLOUD & INFRASTRUCTURE ============
  {
    id: 'cloud-architect',
    title: 'Cloud Solutions Architect',
    icon: '🌩️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Cloud Solutions Architect.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Cloud Architecture, AWS, Azure, GCP, Multi-Cloud, Hybrid Cloud, Cloud Migration, Well-Architected Framework, Cloud Security, Cloud Governance, Cost Optimization, FinOps, High Availability, Disaster Recovery, Microservices, Serverless, Containerization, Kubernetes, Infrastructure as Code, Terraform, CloudFormation, ARM Templates, Landing Zone, Cloud Native, TOGAF, Solution Design.

TECHNICAL FOCUS:
- Enterprise cloud architecture design and governance
- Multi-cloud and hybrid cloud strategies
- Cloud migration planning and execution
- Well-Architected Framework implementation
- Security architecture and compliance
- Cost optimization and FinOps practices
- High availability and disaster recovery design
- Stakeholder communication and technical leadership

ENHANCE BULLETS TO SHOW:
- Migration scale (workloads, applications migrated)
- Cost savings achieved (TCO reduction %)
- Availability improvements and SLA achievements
- Security compliance certifications obtained
- Architecture decisions impact on business`,
  },
  {
    id: 'gcp-engineer',
    title: 'Cloud Engineer (GCP)',
    icon: '🔷',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Cloud Engineer with Google Cloud Platform expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Google Cloud Platform, GCP, Compute Engine, Cloud Functions, Cloud Run, Google Kubernetes Engine, GKE, BigQuery, Cloud Storage, Cloud SQL, Spanner, Firestore, Pub/Sub, Dataflow, Dataproc, Cloud Composer, Vertex AI, Anthos, Cloud IAM, Cloud Armor, Cloud CDN, Cloud Load Balancing, Cloud Monitoring, Cloud Logging, Terraform, Deployment Manager.

TECHNICAL FOCUS:
- GCP infrastructure design and implementation
- GKE cluster management and optimization
- BigQuery data warehouse architecture
- Serverless application development (Cloud Functions, Cloud Run)
- Data pipeline orchestration (Dataflow, Cloud Composer)
- Security and IAM configuration
- Cost management and optimization
- Multi-region and global architecture design

ENHANCE BULLETS TO SHOW:
- Infrastructure cost optimization percentages
- Query performance improvements in BigQuery
- Deployment automation coverage
- System reliability and uptime metrics
- Data processing throughput improvements`,
  },
  {
    id: 'azure-engineer',
    title: 'Cloud Engineer (Azure)',
    icon: '🔵',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Cloud Engineer with Microsoft Azure expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Microsoft Azure, Azure Functions, Azure App Service, Azure Kubernetes Service, AKS, Azure DevOps, Azure SQL, Cosmos DB, Azure Blob Storage, Azure Event Hubs, Azure Service Bus, Azure Logic Apps, Azure Data Factory, Azure Synapse, Azure Databricks, Azure Active Directory, Azure AD, Entra ID, Azure Key Vault, Azure Monitor, Application Insights, ARM Templates, Bicep, Azure Policy, Azure Landing Zones.

TECHNICAL FOCUS:
- Azure infrastructure architecture and deployment
- AKS cluster management and microservices
- Azure DevOps pipeline implementation
- Data platform solutions (Synapse, Databricks)
- Identity and access management (Azure AD/Entra)
- Hybrid cloud with Azure Arc
- Security and compliance implementation
- Cost management and Azure Advisor optimization

ENHANCE BULLETS TO SHOW:
- Cloud adoption and migration metrics
- Cost optimization achievements
- DevOps automation improvements
- Security compliance scores
- Application performance improvements`,
  },
  {
    id: 'kubernetes-engineer',
    title: 'Kubernetes Engineer',
    icon: '☸️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Kubernetes Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Kubernetes, K8s, Docker, Container Orchestration, Helm, Kustomize, Operators, Custom Resource Definitions, CRD, Pod Security, RBAC, Network Policies, Service Mesh, Istio, Linkerd, Ingress Controllers, NGINX, Traefik, Persistent Volumes, StatefulSets, DaemonSets, CronJobs, Horizontal Pod Autoscaler, Cluster Autoscaler, EKS, AKS, GKE, OpenShift, Rancher, ArgoCD, Flux, GitOps.

TECHNICAL FOCUS:
- Kubernetes cluster design, deployment, and management
- Container security and pod security policies
- Service mesh implementation and traffic management
- GitOps workflows with ArgoCD or Flux
- Kubernetes operators and custom controllers
- Multi-cluster and federation strategies
- Observability and troubleshooting
- Cost optimization and resource management

ENHANCE BULLETS TO SHOW:
- Cluster scale (nodes, pods, deployments managed)
- Resource utilization optimization percentages
- Deployment frequency improvements
- Incident reduction and MTTR improvements
- Cost savings from right-sizing`,
  },
  // ============ SECURITY ============
  {
    id: 'security-engineer',
    title: 'Security Engineer',
    icon: '🔐',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Security Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Security Engineering, Application Security, AppSec, Cloud Security, Infrastructure Security, Vulnerability Management, Penetration Testing, SAST, DAST, IAST, SCA, Security Code Review, OWASP, CVE, Threat Modeling, Security Architecture, Zero Trust, Identity and Access Management, IAM, SSO, OAuth, SAML, Encryption, PKI, Secrets Management, HashiCorp Vault, Security Automation, SIEM, SOC.

TECHNICAL FOCUS:
- Application security testing and remediation
- Security architecture design and review
- Vulnerability assessment and management
- Threat modeling and risk assessment
- Identity and access management systems
- Cloud security posture management
- Security automation and DevSecOps
- Incident response and forensics

ENHANCE BULLETS TO SHOW:
- Vulnerabilities discovered and remediated
- Security tool implementation coverage
- Risk reduction metrics
- Compliance achievements (SOC2, ISO, HIPAA)
- Security incident response improvements`,
  },
  {
    id: 'devsecops',
    title: 'DevSecOps Engineer',
    icon: '🛡️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: DevSecOps Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
DevSecOps, Shift-Left Security, Security Automation, CI/CD Security, Pipeline Security, SAST, DAST, SCA, Container Security, Kubernetes Security, Infrastructure as Code Security, Secrets Management, Vulnerability Scanning, Snyk, SonarQube, Checkmarx, Trivy, Aqua Security, Twistlock, HashiCorp Vault, Policy as Code, OPA, Gatekeeper, Compliance Automation, Security Champions.

TECHNICAL FOCUS:
- Security integration in CI/CD pipelines
- Automated vulnerability scanning and remediation
- Container and Kubernetes security hardening
- Infrastructure as Code security scanning
- Secrets management and rotation automation
- Policy as Code implementation
- Security metrics and dashboards
- Developer security training and advocacy

ENHANCE BULLETS TO SHOW:
- Pipeline security coverage percentages
- Vulnerability detection and fix time reduction
- Shift-left adoption metrics
- Developer security training completion rates
- Compliance automation achievements`,
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    icon: '🕵️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Cybersecurity Analyst.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Cybersecurity, SOC, Security Operations Center, Incident Response, Threat Detection, Threat Intelligence, SIEM, Splunk, QRadar, Sentinel, Log Analysis, Malware Analysis, Forensics, Digital Forensics, Intrusion Detection, IDS, IPS, Firewall Management, Endpoint Security, EDR, XDR, Phishing Analysis, Vulnerability Assessment, Risk Assessment, NIST, CIS Controls, MITRE ATT&CK.

TECHNICAL FOCUS:
- Security monitoring and alert triage
- Incident detection, response, and containment
- Threat intelligence analysis and application
- SIEM platform management and rule development
- Malware analysis and reverse engineering
- Security incident documentation and reporting
- Vulnerability assessment and prioritization
- Security awareness and training support

ENHANCE BULLETS TO SHOW:
- Incidents detected and resolved
- Mean time to detect/respond improvements
- False positive reduction percentages
- Threat intelligence contributions
- Security awareness program impact`,
  },
  // ============ BACKEND & SYSTEMS ============
  {
    id: 'backend-python',
    title: 'Backend Engineer (Python)',
    icon: '🐍',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Backend Engineer with Python expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Python, Django, Flask, FastAPI, Celery, Redis, PostgreSQL, MySQL, SQLAlchemy, Alembic, REST API, GraphQL, Asyncio, Aiohttp, Pytest, Unit Testing, Integration Testing, Docker, Kubernetes, AWS, GCP, Microservices, Message Queues, RabbitMQ, Kafka, gRPC, Protocol Buffers, Poetry, Pip, Virtual Environments.

TECHNICAL FOCUS:
- Python backend application development
- RESTful and GraphQL API design
- Database design and ORM optimization
- Asynchronous programming and concurrency
- Testing strategies and test automation
- Microservices architecture implementation
- Message queue integration and event-driven design
- Performance profiling and optimization

ENHANCE BULLETS TO SHOW:
- API performance improvements (latency, throughput)
- Test coverage percentages
- System scale (requests/sec, concurrent users)
- Code quality metrics
- Deployment and delivery improvements`,
  },
  {
    id: 'backend-java',
    title: 'Backend Engineer (Java)',
    icon: '☕',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Backend Engineer with Java expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Java, Spring Boot, Spring Framework, Spring Cloud, Hibernate, JPA, Maven, Gradle, JUnit, Mockito, REST API, Microservices, Kafka, RabbitMQ, Redis, PostgreSQL, MySQL, Oracle, MongoDB, Docker, Kubernetes, AWS, Azure, Jenkins, CI/CD, Multithreading, Concurrency, JVM Tuning, Design Patterns, SOLID Principles.

TECHNICAL FOCUS:
- Java enterprise application development
- Spring Boot microservices architecture
- RESTful API design and implementation
- Database integration and ORM optimization
- Message-driven and event-sourced systems
- Multithreading and concurrent programming
- JVM performance tuning and optimization
- Unit and integration testing strategies

ENHANCE BULLETS TO SHOW:
- Application performance improvements
- System throughput and latency metrics
- Code coverage and quality metrics
- Microservices migration achievements
- Scalability improvements (concurrent users, TPS)`,
  },
  {
    id: 'backend-go',
    title: 'Backend Engineer (Go/Golang)',
    icon: '🐹',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Backend Engineer with Go/Golang expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Go, Golang, Goroutines, Channels, Concurrency, Gin, Echo, Fiber, gRPC, Protocol Buffers, REST API, PostgreSQL, MySQL, MongoDB, Redis, Docker, Kubernetes, Microservices, Cloud Native, AWS, GCP, Azure, Testing, Benchmarking, Profiling, pprof, Static Typing, Interface-based Design, CLI Development.

TECHNICAL FOCUS:
- High-performance Go application development
- Concurrent programming with goroutines and channels
- Microservices and distributed systems
- gRPC and Protocol Buffers implementation
- Database integration and query optimization
- API design and development (REST, gRPC)
- Performance profiling and optimization
- Containerization and cloud-native deployment

ENHANCE BULLETS TO SHOW:
- Performance benchmarks (requests/sec, latency)
- Resource efficiency (memory, CPU usage)
- Concurrency handling (goroutines, connections)
- Build and deployment time improvements
- System reliability metrics`,
  },
  {
    id: 'backend-node',
    title: 'Backend Engineer (Node.js)',
    icon: '💚',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Backend Engineer with Node.js expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Node.js, JavaScript, TypeScript, Express.js, NestJS, Fastify, Koa, REST API, GraphQL, Apollo Server, Prisma, Sequelize, TypeORM, MongoDB, PostgreSQL, MySQL, Redis, RabbitMQ, Kafka, Socket.io, WebSockets, Jest, Mocha, Chai, Docker, Kubernetes, AWS Lambda, Serverless, npm, yarn, pnpm.

TECHNICAL FOCUS:
- Node.js backend application development
- TypeScript for type-safe backend development
- RESTful and GraphQL API implementation
- Real-time applications with WebSockets
- Database integration (SQL and NoSQL)
- Microservices and serverless architecture
- Event-driven and message queue systems
- Testing and quality assurance

ENHANCE BULLETS TO SHOW:
- API performance metrics (response times, throughput)
- Real-time connection handling (concurrent WebSocket connections)
- Server resource optimization
- Test coverage achievements
- Serverless cost optimization`,
  },
  {
    id: 'systems-engineer',
    title: 'Systems Engineer',
    icon: '🖥️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Systems Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Systems Engineering, Linux, Unix, Windows Server, System Administration, Shell Scripting, Bash, PowerShell, Python, Ansible, Puppet, Chef, Configuration Management, Networking, TCP/IP, DNS, DHCP, Load Balancing, Virtualization, VMware, Hyper-V, Storage Systems, SAN, NAS, Backup and Recovery, High Availability, Clustering, Performance Tuning, Capacity Planning.

TECHNICAL FOCUS:
- Linux/Unix system administration and optimization
- Configuration management and automation
- Network infrastructure design and management
- Virtualization platform management
- Storage systems and data management
- High availability and clustering solutions
- Performance tuning and capacity planning
- Disaster recovery and backup strategies

ENHANCE BULLETS TO SHOW:
- System uptime and availability percentages
- Automation coverage improvements
- Performance optimization achievements
- Cost savings from consolidation
- Incident reduction metrics`,
  },
  // ============ FRONTEND & MOBILE ============
  {
    id: 'frontend-vue',
    title: 'Frontend Engineer (Vue.js)',
    icon: '💚',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Frontend Engineer specializing in Vue.js.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Vue.js, Vue 3, Composition API, Vuex, Pinia, Vue Router, Nuxt.js, TypeScript, JavaScript, Vite, Webpack, Vitest, Jest, Cypress, Tailwind CSS, SCSS, CSS3, HTML5, Responsive Design, Component Libraries, Vuetify, Quasar, PrimeVue, Storybook, PWA, SPA, SSR, Accessibility, WCAG, Web Performance.

TECHNICAL FOCUS:
- Vue.js application architecture (Options and Composition API)
- State management with Vuex/Pinia
- Server-side rendering with Nuxt.js
- TypeScript integration in Vue projects
- Component library development
- Performance optimization and lazy loading
- Testing strategies for Vue components
- Accessibility and responsive design

ENHANCE BULLETS TO SHOW:
- Performance improvements (Lighthouse, bundle size)
- Component reusability metrics
- User experience improvements
- Accessibility compliance
- Development velocity improvements`,
  },
  {
    id: 'frontend-angular',
    title: 'Frontend Engineer (Angular)',
    icon: '🅰️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Frontend Engineer specializing in Angular.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Angular, TypeScript, RxJS, NgRx, Angular Material, Angular CLI, Jasmine, Karma, Protractor, Cypress, Jest, Angular Universal, SSR, PWA, Lazy Loading, Angular Modules, Components, Services, Dependency Injection, Reactive Forms, Template-Driven Forms, Angular Router, HTTP Client, Interceptors, Guards, Pipes, Directives.

TECHNICAL FOCUS:
- Angular enterprise application development
- Reactive programming with RxJS
- State management with NgRx
- Server-side rendering with Angular Universal
- Component architecture and module design
- Form handling (reactive and template-driven)
- Performance optimization and lazy loading
- Testing and quality assurance

ENHANCE BULLETS TO SHOW:
- Application performance metrics
- Code coverage and quality metrics
- Enterprise-scale implementations
- Accessibility improvements
- Development efficiency gains`,
  },
  {
    id: 'mobile-react-native',
    title: 'Mobile Developer (React Native)',
    icon: '📱',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Mobile Developer with React Native expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
React Native, JavaScript, TypeScript, iOS, Android, Cross-Platform, Expo, React Navigation, Redux, MobX, Zustand, Native Modules, Bridge, JSI, Hermes, Metro Bundler, Jest, Detox, E2E Testing, App Store, Google Play, Push Notifications, Firebase, CodePush, Over-the-Air Updates, Performance Optimization, Animations, Reanimated.

TECHNICAL FOCUS:
- Cross-platform mobile application development
- Native module integration and bridging
- State management for mobile applications
- Navigation patterns and deep linking
- Performance optimization and profiling
- App store deployment and updates (iOS/Android)
- Push notifications and background tasks
- Testing strategies for mobile apps

ENHANCE BULLETS TO SHOW:
- App store ratings and user reviews
- Download counts and active users
- Performance metrics (startup time, frame rates)
- Crash-free session rates
- Cross-platform code sharing percentages`,
  },
  {
    id: 'mobile-ios',
    title: 'iOS Developer',
    icon: '🍎',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: iOS Developer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
iOS, Swift, SwiftUI, UIKit, Objective-C, Xcode, CocoaPods, Swift Package Manager, Core Data, Realm, Combine, RxSwift, MVVM, MVC, VIPER, Clean Architecture, Auto Layout, Storyboards, XIBs, XCTest, XCUITest, TestFlight, App Store Connect, Push Notifications, APNs, Core Animation, Core Graphics, ARKit, HealthKit, CloudKit.

TECHNICAL FOCUS:
- Native iOS application development
- SwiftUI and UIKit implementation
- Architecture patterns (MVVM, VIPER, Clean)
- Reactive programming with Combine/RxSwift
- Data persistence and Core Data
- Testing and continuous integration
- App Store submission and review process
- Performance optimization and memory management

ENHANCE BULLETS TO SHOW:
- App Store ratings and rankings
- User acquisition and retention metrics
- App performance improvements
- Crash-free session rates
- Feature adoption and engagement`,
  },
  {
    id: 'mobile-android',
    title: 'Android Developer',
    icon: '🤖',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Android Developer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Android, Kotlin, Java, Jetpack Compose, Android SDK, Android Studio, Gradle, Coroutines, Flow, LiveData, ViewModel, Room, Retrofit, OkHttp, Dagger, Hilt, Koin, MVVM, MVI, Clean Architecture, JUnit, Espresso, UI Testing, Google Play Console, Firebase, FCM, WorkManager, Navigation Component, Material Design.

TECHNICAL FOCUS:
- Native Android application development
- Jetpack Compose and modern Android development
- Architecture patterns (MVVM, MVI, Clean)
- Kotlin coroutines and Flow for async operations
- Dependency injection with Hilt/Dagger
- Data persistence with Room
- Testing strategies (unit, UI, integration)
- Google Play deployment and optimization

ENHANCE BULLETS TO SHOW:
- Google Play ratings and reviews
- User engagement and retention metrics
- App performance improvements (ANR, crash rates)
- Kotlin adoption and code modernization
- Feature delivery and A/B testing results`,
  },
  {
    id: 'mobile-flutter',
    title: 'Mobile Developer (Flutter)',
    icon: '🦋',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Mobile Developer with Flutter expertise.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Flutter, Dart, Cross-Platform, iOS, Android, Widget, StatefulWidget, StatelessWidget, Provider, Riverpod, Bloc, GetX, Firebase, FlutterFire, Pub.dev, Platform Channels, Native Integration, Material Design, Cupertino, Responsive Design, Flutter Test, Integration Testing, CI/CD, Fastlane, Codemagic, App Store, Google Play.

TECHNICAL FOCUS:
- Flutter cross-platform application development
- Widget architecture and composition
- State management (Provider, Riverpod, Bloc)
- Platform channel integration for native features
- Firebase integration and backend services
- Responsive and adaptive UI design
- Testing and continuous integration
- App store deployment for iOS and Android

ENHANCE BULLETS TO SHOW:
- Cross-platform code sharing percentages
- App store ratings on both platforms
- Development velocity improvements
- Performance metrics (startup, animations)
- User engagement and retention`,
  },
  // ============ SPECIALIZED ROLES ============
  {
    id: 'blockchain-engineer',
    title: 'Blockchain Engineer',
    icon: '⛓️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Blockchain Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Blockchain, Smart Contracts, Solidity, Ethereum, Web3, Hardhat, Truffle, Foundry, EVM, DeFi, NFT, ERC-20, ERC-721, Layer 2, Polygon, Arbitrum, Optimism, IPFS, Chainlink, Oracles, Gas Optimization, Security Audits, OpenZeppelin, ethers.js, web3.js, Metamask, Wallet Integration, Consensus Mechanisms, Proof of Stake, Cross-chain.

TECHNICAL FOCUS:
- Smart contract development and deployment
- Solidity best practices and security patterns
- DeFi protocol development
- Gas optimization techniques
- Security auditing and vulnerability prevention
- Web3 frontend integration
- Layer 2 scaling solutions
- Cross-chain interoperability

ENHANCE BULLETS TO SHOW:
- TVL (Total Value Locked) in deployed contracts
- Gas optimization savings percentages
- Security audit results and improvements
- Smart contract deployment metrics
- User adoption and transaction volumes`,
  },
  {
    id: 'embedded-engineer',
    title: 'Embedded Systems Engineer',
    icon: '🔌',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Embedded Systems Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Embedded Systems, C, C++, Embedded C, RTOS, FreeRTOS, Zephyr, Bare Metal, Microcontrollers, ARM, Cortex-M, STM32, ESP32, Arduino, Raspberry Pi, I2C, SPI, UART, CAN, Modbus, Firmware Development, Device Drivers, Bootloaders, JTAG, Oscilloscope, Logic Analyzer, Power Management, Low Power Design, IoT, Sensors, Actuators.

TECHNICAL FOCUS:
- Firmware development for microcontrollers
- RTOS implementation and task management
- Device driver development
- Communication protocols (I2C, SPI, UART, CAN)
- Power management and low-power design
- Hardware debugging and testing
- Bootloader development and OTA updates
- Sensor integration and signal processing

ENHANCE BULLETS TO SHOW:
- Power consumption improvements
- Real-time performance metrics
- Memory optimization achievements
- Product reliability metrics
- Time-to-market improvements`,
  },
  {
    id: 'game-developer',
    title: 'Game Developer',
    icon: '🎮',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Game Developer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Game Development, Unity, Unreal Engine, C#, C++, Game Physics, Graphics Programming, Shaders, HLSL, GLSL, 3D Math, Linear Algebra, Animation Systems, AI Programming, Pathfinding, Multiplayer, Networking, Optimization, Profiling, Mobile Games, Console Development, Steam, PlayStation, Xbox, VR, AR, Game Design, Level Design.

TECHNICAL FOCUS:
- Game engine development and optimization
- Graphics and shader programming
- Physics and animation systems
- AI and pathfinding algorithms
- Multiplayer and networking systems
- Cross-platform development
- Performance optimization and profiling
- VR/AR game development

ENHANCE BULLETS TO SHOW:
- Game performance metrics (FPS, load times)
- Player engagement and retention
- Download counts and revenue
- Platform launches and ratings
- Technical innovation achievements`,
  },
  {
    id: 'qa-engineer',
    title: 'QA/Test Engineer',
    icon: '🧪',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: QA/Test Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Quality Assurance, QA, Software Testing, Test Automation, Selenium, Cypress, Playwright, Appium, JUnit, TestNG, Pytest, Jest, API Testing, Postman, REST Assured, Performance Testing, JMeter, Gatling, Load Testing, Stress Testing, Test Planning, Test Cases, Test Strategy, BDD, Cucumber, CI/CD, Jenkins, Bug Tracking, Jira, Regression Testing, Smoke Testing.

TECHNICAL FOCUS:
- Test automation framework development
- API and integration testing
- End-to-end testing strategies
- Performance and load testing
- Mobile application testing
- CI/CD pipeline integration
- Test planning and strategy
- Bug tracking and quality metrics

ENHANCE BULLETS TO SHOW:
- Test automation coverage percentages
- Bug detection rates and quality improvements
- Test execution time reductions
- Release quality improvements
- Regression prevention achievements`,
  },
  {
    id: 'sdet',
    title: 'Software Development Engineer in Test (SDET)',
    icon: '⚗️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Software Development Engineer in Test (SDET).

REQUIRED ATS KEYWORDS TO INCORPORATE:
SDET, Test Automation, Python, Java, JavaScript, TypeScript, Selenium, Cypress, Playwright, Appium, REST Assured, API Testing, Microservices Testing, Contract Testing, Pact, Performance Testing, Chaos Engineering, Test Infrastructure, CI/CD, Docker, Kubernetes, TDD, BDD, Code Coverage, Static Analysis, Quality Engineering.

TECHNICAL FOCUS:
- Test framework architecture and development
- API and service-level testing
- Test infrastructure and tooling
- Performance and reliability testing
- Contract testing for microservices
- Chaos engineering and resilience testing
- Code quality and static analysis
- Developer tooling and productivity

ENHANCE BULLETS TO SHOW:
- Test infrastructure improvements
- Automation coverage expansion
- Developer productivity gains
- Quality metric improvements
- Testing time reductions`,
  },
  {
    id: 'technical-writer',
    title: 'Technical Writer',
    icon: '📝',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Technical Writer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Technical Writing, Documentation, API Documentation, User Guides, Developer Documentation, README, Markdown, AsciiDoc, reStructuredText, Docs as Code, Git, Static Site Generators, Docusaurus, MkDocs, Sphinx, Jekyll, DITA, XML, Information Architecture, Content Strategy, Style Guides, Editing, Proofreading, Diagramming, UML, Sequence Diagrams.

TECHNICAL FOCUS:
- API and developer documentation
- User guide and tutorial creation
- Documentation architecture and structure
- Docs-as-code workflows
- Diagram and visual content creation
- Style guide development and enforcement
- Content management and versioning
- Cross-functional collaboration

ENHANCE BULLETS TO SHOW:
- Documentation coverage improvements
- User satisfaction and feedback scores
- Documentation adoption metrics
- Support ticket reduction
- Developer onboarding time improvements`,
  },
  {
    id: 'product-manager-technical',
    title: 'Technical Product Manager',
    icon: '📋',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Technical Product Manager.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Product Management, Technical Product Manager, Product Roadmap, Product Strategy, Agile, Scrum, Kanban, User Stories, Requirements Gathering, PRD, Product Requirements Document, A/B Testing, Data-Driven Decisions, KPIs, OKRs, User Research, Market Analysis, Competitive Analysis, Stakeholder Management, Cross-functional Leadership, API Products, Developer Experience, Platform Products, Technical Architecture.

TECHNICAL FOCUS:
- Technical product strategy and roadmapping
- Feature prioritization and backlog management
- Technical requirements and architecture input
- Data analysis and metrics-driven decisions
- A/B testing and experimentation
- Developer and platform product management
- API product strategy
- Stakeholder and cross-functional collaboration

ENHANCE BULLETS TO SHOW:
- Product metrics improvements (engagement, revenue)
- Feature adoption and usage rates
- Customer satisfaction improvements
- Roadmap delivery and execution
- Technical debt management achievements`,
  },
  {
    id: 'engineering-manager',
    title: 'Engineering Manager',
    icon: '👔',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Engineering Manager.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Engineering Management, People Management, Team Leadership, Technical Leadership, Hiring, Recruiting, Performance Management, 1:1s, Career Development, Mentorship, Agile, Scrum, Sprint Planning, Roadmap Planning, Cross-functional Collaboration, Stakeholder Management, Technical Strategy, Architecture Decisions, Team Building, Culture, Engineering Excellence, Process Improvement, Delivery Management.

TECHNICAL FOCUS:
- Engineering team leadership and growth
- Hiring, onboarding, and talent development
- Performance management and career coaching
- Technical strategy and decision-making
- Agile process implementation and improvement
- Cross-functional partnership and alignment
- Engineering culture and practices
- Delivery management and execution

ENHANCE BULLETS TO SHOW:
- Team growth and retention metrics
- Delivery velocity improvements
- Team engagement and satisfaction scores
- Successful hiring and onboarding
- Process improvement achievements`,
  },
  {
    id: 'solutions-engineer',
    title: 'Solutions Engineer',
    icon: '🤝',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Solutions Engineer / Sales Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Solutions Engineering, Sales Engineering, Pre-Sales, Technical Sales, Customer Engagement, Product Demonstrations, POC, Proof of Concept, Technical Presentations, RFP, RFI, Solution Architecture, Integration, API, Custom Development, Technical Requirements, Customer Success, Account Management, SaaS, Enterprise Sales, CRM, Salesforce, Technical Documentation, Competitive Analysis.

TECHNICAL FOCUS:
- Technical solution design and presentation
- Product demonstrations and POC execution
- Customer requirements gathering and analysis
- Integration architecture and guidance
- Technical proposal and RFP responses
- Customer relationship and trust building
- Cross-functional collaboration (sales, product, engineering)
- Market and competitive intelligence

ENHANCE BULLETS TO SHOW:
- Deal sizes and win rates influenced
- POC success rates
- Customer satisfaction scores
- Revenue influenced or generated
- Technical wins and customer references`,
  },
  {
    id: 'database-engineer',
    title: 'Database Engineer/DBA',
    icon: '🗄️',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Database Engineer / Database Administrator.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Database Administration, DBA, Database Engineering, PostgreSQL, MySQL, Oracle, SQL Server, MongoDB, Cassandra, Redis, Database Design, Data Modeling, Query Optimization, Performance Tuning, Index Optimization, Replication, Sharding, High Availability, Disaster Recovery, Backup and Recovery, Database Security, SQL, PL/SQL, Database Migration, ETL, Data Governance.

TECHNICAL FOCUS:
- Database design and architecture
- Query optimization and performance tuning
- High availability and disaster recovery
- Replication and sharding strategies
- Database security and access control
- Backup, recovery, and data protection
- Database migration and upgrades
- Capacity planning and scaling

ENHANCE BULLETS TO SHOW:
- Query performance improvements
- Uptime and availability achievements
- Data volume managed (TB, records)
- Recovery time objective (RTO) improvements
- Cost optimization achievements`,
  },
  {
    id: 'api-engineer',
    title: 'API Engineer',
    icon: '🔗',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: API Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
API Development, REST API, RESTful, GraphQL, gRPC, API Design, OpenAPI, Swagger, API Gateway, Kong, Apigee, AWS API Gateway, Rate Limiting, Authentication, OAuth 2.0, JWT, API Security, API Versioning, API Documentation, Postman, API Testing, Microservices, Webhooks, Event-Driven, API Performance, API Monitoring.

TECHNICAL FOCUS:
- RESTful API design and best practices
- GraphQL schema design and resolvers
- API gateway implementation and management
- Authentication and authorization (OAuth, JWT)
- API versioning and deprecation strategies
- API documentation and developer experience
- Performance optimization and caching
- API monitoring and analytics

ENHANCE BULLETS TO SHOW:
- API adoption and usage metrics
- Latency and performance improvements
- Developer satisfaction scores
- API reliability and uptime
- Integration success rates`,
  },
  {
    id: 'observability-engineer',
    title: 'Observability Engineer',
    icon: '📡',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Observability Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Observability, Monitoring, Logging, Tracing, Metrics, Prometheus, Grafana, Datadog, New Relic, Splunk, ELK Stack, Elasticsearch, Logstash, Kibana, Jaeger, Zipkin, OpenTelemetry, APM, Application Performance Monitoring, Alerting, PagerDuty, Opsgenie, SLO, SLI, Dashboards, Distributed Tracing, Log Aggregation.

TECHNICAL FOCUS:
- Observability stack design and implementation
- Metrics collection and visualization
- Distributed tracing implementation
- Log aggregation and analysis
- Alerting strategy and noise reduction
- SLO/SLI definition and monitoring
- Performance monitoring and profiling
- Incident detection and root cause analysis

ENHANCE BULLETS TO SHOW:
- MTTD (Mean Time to Detect) improvements
- Alert noise reduction percentages
- Observability coverage expansion
- Root cause analysis time reduction
- System visibility improvements`,
  },
  {
    id: 'fintech-engineer',
    title: 'FinTech Engineer',
    icon: '💰',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: FinTech Engineer / Financial Software Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
FinTech, Financial Services, Payments, Payment Processing, Banking, Trading Systems, Risk Management, Compliance, Regulatory, PCI-DSS, SOC 2, GDPR, Fraud Detection, Anti-Money Laundering, AML, KYC, Ledger Systems, Double-Entry Accounting, Real-time Processing, Low Latency, High Availability, Data Encryption, Secure Coding, Financial APIs, Plaid, Stripe.

TECHNICAL FOCUS:
- Payment processing and transaction systems
- Financial data security and encryption
- Regulatory compliance implementation
- Fraud detection and prevention systems
- Real-time trading or transaction systems
- Ledger and accounting system design
- Integration with financial APIs and services
- High availability for financial services

ENHANCE BULLETS TO SHOW:
- Transaction volumes processed
- System uptime and reliability
- Compliance certifications achieved
- Fraud prevention rates
- Payment processing latency metrics`,
  },
  {
    id: 'healthcare-engineer',
    title: 'Healthcare Software Engineer',
    icon: '🏥',
    prompt: `${BASE_INSTRUCTIONS}
TARGET ROLE: Healthcare Software Engineer.

REQUIRED ATS KEYWORDS TO INCORPORATE:
Healthcare IT, Health Tech, HealthTech, HIPAA, HL7, FHIR, EHR, EMR, Electronic Health Records, Medical Devices, FDA, Clinical Software, Telemedicine, Telehealth, Patient Data, PHI, Protected Health Information, Interoperability, Healthcare APIs, Clinical Decision Support, Medical Imaging, DICOM, Healthcare Analytics, Compliance, Security.

TECHNICAL FOCUS:
- HIPAA-compliant software development
- Healthcare interoperability (HL7, FHIR)
- EHR/EMR system integration
- Patient data security and privacy
- Medical device software development
- Telemedicine platform development
- Clinical decision support systems
- Healthcare data analytics

ENHANCE BULLETS TO SHOW:
- HIPAA compliance achievements
- Patient data protection metrics
- System interoperability improvements
- User adoption in clinical settings
- Regulatory approval achievements`,
  },
];

// Default selected roles (none by default)
export const DEFAULT_SELECTED_ROLES = [];
