import React, { useEffect, useMemo, useState } from 'react';
import { pagesAPI } from '../services/api';
import {
  ArrowUpRight,
  Award,
  BrainCircuit,
  BriefcaseBusiness,
  Code2,
  Database,
  ExternalLink,
  Github,
  Globe2,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Rocket,
  Server,
  Sparkles,
} from 'lucide-react';

const canonicalContent = {
  name: 'M. Mubeen Ejaz',
  title: 'Full-Stack Software Engineer & AI Solutions Developer',
  eyebrow: 'Developer & Maintainer of LegalMate',
  bio:
    'I build production-grade web applications, AI-powered systems and scalable backend architectures across modern stacks. My work spans SaaS platforms, real-time applications, RAG-based AI, cloud deployments and automation.',
  profileImage: 'https://avatars.githubusercontent.com/u/94120325?v=4',
  location: 'Burewala, Pakistan',
  email: 'mubeenejaz128@gmail.com',
  github: 'https://github.com/MubeenEjaz128',
  linkedin: 'https://www.linkedin.com/in/mubeen-ejaz/',
  website: 'https://www.mubeenejaz.app/',
  stats: [
    { value: '10+', label: 'Projects shipped' },
    { value: '5+', label: 'Live deployments' },
    { value: '3.75', label: 'BSCS CGPA' },
  ],
  skills: [
    {
      category: 'Full-Stack Web',
      icon: 'code',
      description: 'Modern, responsive applications with scalable APIs and real-time workflows.',
      items: ['React.js', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'REST APIs', 'WebSockets'],
    },
    {
      category: 'Backend & Architecture',
      icon: 'server',
      description: 'Production-grade services, databases, authentication and systems architecture.',
      items: ['Node.js', 'Express.js', 'Django', 'PHP Laravel', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
    },
    {
      category: 'AI & Machine Learning',
      icon: 'ai',
      description: 'RAG pipelines, AI agents, LLM integrations and predictive machine-learning solutions.',
      items: ['RAG Systems', 'AI Agents', 'OpenAI API', 'Vector DBs', 'Scikit-Learn', 'Pandas', 'NLP'],
    },
    {
      category: 'Cloud & DevOps',
      icon: 'cloud',
      description: 'Deployment, Linux administration, CI/CD and production infrastructure.',
      items: ['Vercel', 'Render', 'Docker', 'Linux VPS', 'Nginx', 'Git/GitHub', 'PyQt'],
    },
  ],
  projects: [
    {
      name: 'LegalMate',
      badge: 'SaaS · AI',
      description:
        'AI-powered legal consultation platform connecting clients with verified legal practitioners with RAG assistance, booking, chat and real-time video consultation.',
      tech: ['React', 'Node.js', 'MongoDB', 'Socket.IO', 'WebRTC', 'RAG / AI'],
      highlights: ['RAG-based legal assistant', 'Real-time video & chat', 'Appointment scheduling', 'PKR wallet workflows'],
      live: 'https://legalmate.me',
      github: 'https://github.com/MubeenEjaz128/LegalMate-V2',
    },
    {
      name: 'SupportDesk',
      badge: 'SaaS Platform',
      description:
        'Enterprise customer-support workspace with role-based access, ticket lifecycle management and AI-assisted response suggestions.',
      tech: ['Django', 'React', 'MongoDB', 'AI / LLM', 'Render', 'Vercel'],
      highlights: ['Admin / Supervisor / Agent RBAC', 'Ticket workflows', 'Customer history', 'AI reply assistance'],
      live: 'https://support-desk-lac.vercel.app',
      github: 'https://github.com/MubeenEjaz128/SupportDesk',
    },
    {
      name: 'Bologna',
      badge: 'Portal System',
      description:
        'Academic admission and verification portal with document workflows, certificate generation and administrative auditing.',
      tech: ['React', 'Node.js', 'Express', 'MySQL', 'Tailwind CSS'],
      highlights: ['Admission workflows', 'Document verification', 'PDF generation', 'Role-based admin'],
      live: 'https://bologna-liart.vercel.app',
      github: 'https://github.com/MubeenEjaz128/bologna',
    },
    {
      name: 'Clinical Disease Prediction',
      badge: 'AI · ML',
      description:
        'Machine-learning diagnostic platform that predicts clinical disorders from symptom patterns and was commercialized for real screening use.',
      tech: ['Python', 'Scikit-Learn', 'Flask', 'Pandas'],
      highlights: ['Supervised classification', '92% reported accuracy', 'Clinical workflow', 'Commercialized solution'],
    },
    {
      name: 'Attendance & Telemetry',
      badge: 'Systems',
      description:
        'Desktop-led attendance and telemetry workflow with camera verification, reporting and local data synchronization.',
      tech: ['Python', 'PyQt', 'OpenCV', 'SQLite'],
      highlights: ['Camera verification', 'Automated logging', 'Excel/PDF reports', 'Local sync'],
      github: 'https://github.com/MubeenEjaz128/Attendence-System',
    },
    {
      name: 'Predictive ML & NLP',
      badge: 'AI · NLP',
      description:
        'Forecasting and language-modeling workflows covering rainfall, diabetes risk and next-word autocomplete.',
      tech: ['Python', 'Scikit-Learn', 'NLTK', 'Random Forest', 'Flask'],
      highlights: ['Forecasting pipelines', '88%+ reported precision', 'NLP autocomplete', 'Realtime inference APIs'],
      github: 'https://github.com/MubeenEjaz128/Next-word-Prediction',
    },
  ],
  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      institution: 'COMSATS University Islamabad',
      year: '2022 — 2026',
      description:
        'CGPA 3.75 / 4.00. Focused on software engineering, databases, AI/ML, networking and production system development.',
    },
  ],
  achievements: [
    'Built and shipped 10+ software projects across SaaS, AI/ML, portals and automation.',
    'Deployed 5+ production applications across Vercel, Render and VPS infrastructure.',
    'Built RAG-based AI workflows and real-time WebRTC / Socket.IO systems.',
    'Commercialized a machine-learning disease prediction solution for practical use.',
  ],
};

const isMeaningful = (value) =>
  typeof value === 'string' &&
  value.trim() &&
  !/your name|yourwebsite|yourusername|example\.com/i.test(value);

const normalizeContent = (incoming = {}) => {
  const normalized = { ...canonicalContent };

  if (isMeaningful(incoming.name) && incoming.name.trim().toLowerCase() !== 'mubeen') {
    normalized.name = incoming.name.trim();
  }
  if (isMeaningful(incoming.title)) normalized.title = incoming.title.trim();
  else if (isMeaningful(incoming.role) && incoming.role !== 'Full Stack Developer') normalized.title = incoming.role.trim();
  if (isMeaningful(incoming.bio) && incoming.bio.length > 70) normalized.bio = incoming.bio.trim();
  if (isMeaningful(incoming.profileImage)) normalized.profileImage = incoming.profileImage.trim();

  const validUrl = (url, badPattern) => isMeaningful(url) && !(badPattern && badPattern.test(url));
  if (validUrl(incoming.github, /github\.com\/mubeen\/?$/i)) normalized.github = incoming.github;
  if (validUrl(incoming.linkedin, /linkedin\.com\/in\/mubeen\/?$/i)) normalized.linkedin = incoming.linkedin;
  if (validUrl(incoming.website)) normalized.website = incoming.website;
  if (isMeaningful(incoming.email) && !/mubeen@example\.com/i.test(incoming.email)) normalized.email = incoming.email;

  if (
    Array.isArray(incoming.skills) &&
    incoming.skills.length &&
    incoming.skills.every((group) => group && typeof group === 'object' && Array.isArray(group.items))
  ) normalized.skills = incoming.skills;

  if (
    Array.isArray(incoming.projects) &&
    incoming.projects.length &&
    incoming.projects.every((project) => project && typeof project === 'object' && project.name)
  ) normalized.projects = incoming.projects;

  if (
    Array.isArray(incoming.education) &&
    incoming.education.length &&
    incoming.education.every((entry) => entry && typeof entry === 'object' && entry.degree)
  ) normalized.education = incoming.education;

  if (Array.isArray(incoming.achievements) && incoming.achievements.length) {
    normalized.achievements = incoming.achievements.filter(Boolean);
  }
  if (Array.isArray(incoming.stats) && incoming.stats.length) normalized.stats = incoming.stats;

  return normalized;
};

const skillIcon = {
  code: Code2,
  server: Server,
  ai: BrainCircuit,
  cloud: Database,
};

const DeveloperPage = () => {
  const [content, setContent] = useState(canonicalContent);

  useEffect(() => {
    let mounted = true;

    const fetchContent = async () => {
      try {
        const response = await pagesAPI.getPage('developer');
        const fetchedContent = response.data.page?.content || {};
        if (mounted) setContent(normalizeContent(fetchedContent));
      } catch (error) {
        console.error('Error fetching developer info:', error);
        if (mounted) setContent(canonicalContent);
      }
    };

    fetchContent();
    return () => {
      mounted = false;
    };
  }, []);

  const displayContent = useMemo(() => normalizeContent(content), [content]);

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-secondary-900">
      <section className="relative overflow-hidden border-b border-secondary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-accent-200/25 blur-3xl" />

        <div className="relative container-custom py-14 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                {displayContent.eyebrow}
              </div>

              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-secondary-900 sm:text-5xl lg:text-6xl">
                {displayContent.name}
              </h1>

              <p className="mt-4 text-xl font-bold text-primary-700 sm:text-2xl">
                {displayContent.title}
              </p>

              <p className="mt-6 max-w-3xl text-base leading-8 text-secondary-600 sm:text-lg">
                {displayContent.bio}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-secondary-600">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  {displayContent.location}
                </span>
                <a href={"mailto:" + displayContent.email} className="inline-flex items-center gap-2 transition hover:text-primary-700">
                  <Mail className="h-4 w-4 text-primary-600" />
                  {displayContent.email}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={displayContent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  View Portfolio <ArrowUpRight className="h-4 w-4" />
                </a>

                <a
                  href={displayContent.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-white px-5 py-3 text-sm font-bold text-secondary-800 shadow-sm transition hover:border-primary-300 hover:text-primary-700"
                >
                  <Github className="h-4 w-4" /> GitHub
                </a>

                <a
                  href={displayContent.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-white px-5 py-3 text-sm font-bold text-secondary-800 shadow-sm transition hover:border-primary-300 hover:text-primary-700"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                {displayContent.stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-secondary-100 bg-white p-4 shadow-soft">
                    <div className="text-2xl font-extrabold text-secondary-900 sm:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-xs font-medium text-secondary-500 sm:text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="relative rounded-[2rem] border border-secondary-100 bg-white p-3 shadow-elevated">
                <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-100 to-accent-100/50 blur-2xl" />
                <img
                  src={displayContent.profileImage}
                  alt={displayContent.name}
                  className="aspect-[4/5] w-full rounded-[1.55rem] bg-secondary-100 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = 'https://avatars.githubusercontent.com/u/94120325?v=4';
                  }}
                />
                <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
                  <div className="text-sm font-extrabold tracking-wide text-secondary-900">M. MUBEEN EJAZ</div>
                  <div className="mt-1 text-xs font-medium text-secondary-500">Full-Stack · AI · Cloud · Systems</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container-custom space-y-16 py-14 lg:py-20">
        <section>
          <div className="mb-8">
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600">Technical Profile</div>
            <h2 className="mt-3 text-3xl font-bold text-secondary-900 sm:text-4xl">Technical Expertise</h2>
            <p className="mt-3 max-w-2xl text-secondary-600">
              Production-focused skills across frontend, backend, AI and deployment.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {displayContent.skills.map((group) => {
              const Icon = skillIcon[group.icon] || Code2;
              return (
                <article
                  key={group.category}
                  className="rounded-2xl border border-secondary-100 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-primary-100 p-3 text-primary-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-secondary-900">{group.category}</h3>
                      <p className="mt-2 text-sm leading-6 text-secondary-600">{group.description}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-8">
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600">Selected Work</div>
            <h2 className="mt-3 text-3xl font-bold text-secondary-900 sm:text-4xl">Featured Projects</h2>
            <p className="mt-3 max-w-3xl text-secondary-600">
              SaaS, AI/ML, real-time communication, portal systems and automation projects.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {displayContent.projects.map((project) => (
              <article
                key={project.name}
                className="group rounded-2xl border border-secondary-100 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-700">
                      {project.badge}
                    </span>
                    <h3 className="mt-4 text-2xl font-bold text-secondary-900">{project.name}</h3>
                  </div>
                  <div className="rounded-xl bg-secondary-50 p-2.5 text-secondary-400 transition group-hover:bg-primary-50 group-hover:text-primary-600">
                    <Rocket className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 leading-7 text-secondary-600">{project.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-secondary-100 bg-secondary-50 px-2.5 py-1.5 text-xs font-semibold text-secondary-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {project.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-2 text-sm text-secondary-600">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary-500" />
                      {highlight}
                    </div>
                  ))}
                </div>

                {(project.live || project.github) && (
                  <div className="mt-6 flex flex-wrap gap-4 border-t border-secondary-100 pt-5">
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 hover:text-primary-800"
                      >
                        Live project <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-secondary-700 hover:text-primary-700"
                      >
                        <Github className="h-4 w-4" /> Repository
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-secondary-100 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-primary-700">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xs font-extrabold uppercase tracking-[0.18em]">Education</span>
            </div>

            {displayContent.education.map((edu) => (
              <div key={edu.degree} className="mt-6">
                <h3 className="text-2xl font-bold text-secondary-900">{edu.degree}</h3>
                <p className="mt-2 font-bold text-primary-700">{edu.institution}</p>
                <p className="mt-1 text-sm text-secondary-500">{edu.year}</p>
                <p className="mt-4 leading-7 text-secondary-600">{edu.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-secondary-100 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-primary-700">
              <Award className="h-6 w-6" />
              <span className="text-xs font-extrabold uppercase tracking-[0.18em]">Highlights</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {displayContent.achievements.map((item, index) => (
                <div key={item} className="rounded-xl border border-secondary-100 bg-secondary-50 p-4">
                  <div className="text-xs font-extrabold text-primary-600">0{index + 1}</div>
                  <p className="mt-2 text-sm leading-6 text-secondary-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-7 shadow-soft sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2 text-primary-700">
                <BriefcaseBusiness className="h-5 w-5" />
                <span className="text-xs font-extrabold uppercase tracking-[0.18em]">Build Something Useful</span>
              </div>
              <h2 className="mt-4 text-3xl font-bold text-secondary-900 sm:text-4xl">Let&apos;s work together.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-secondary-600">
                For full-stack development, AI integrations, SaaS products, backend architecture or deployment work, reach out through the portfolio or email.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href={"mailto:" + displayContent.email}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-700"
              >
                <Mail className="h-4 w-4" /> Email
              </a>

              <a
                href={displayContent.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-white px-5 py-3 text-sm font-bold text-secondary-800 shadow-sm hover:border-primary-300 hover:text-primary-700"
              >
                <Globe2 className="h-4 w-4" /> Portfolio
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DeveloperPage;
