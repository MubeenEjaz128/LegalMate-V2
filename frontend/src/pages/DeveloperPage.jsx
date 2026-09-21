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
  TerminalSquare,
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
  whatsapp: 'https://wa.me/923177099128',
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
  ) {
    normalized.skills = incoming.skills;
  }
  if (
    Array.isArray(incoming.projects) &&
    incoming.projects.length &&
    incoming.projects.every((project) => project && typeof project === 'object' && project.name)
  ) {
    normalized.projects = incoming.projects;
  }
  if (
    Array.isArray(incoming.education) &&
    incoming.education.length &&
    incoming.education.every((entry) => entry && typeof entry === 'object' && entry.degree)
  ) {
    normalized.education = incoming.education;
  }
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
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchContent();
    return () => {
      mounted = false;
    };
  }, []);

  const displayContent = useMemo(() => normalizeContent(content), [content]);

  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(245,158,11,0.14),transparent_28%),linear-gradient(135deg,#071019_0%,#0b1622_45%,#071019_100%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                <Sparkles className="h-4 w-4" />
                {displayContent.eyebrow}
              </div>

              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
                {displayContent.name}
              </h1>
              <p className="mt-4 text-xl font-semibold text-amber-300 sm:text-2xl">
                {displayContent.title}
              </p>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                {displayContent.bio}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-300" />
                  {displayContent.location}
                </span>
                <a href={"mailto:" + displayContent.email} className="inline-flex items-center gap-2 hover:text-white">
                  <Mail className="h-4 w-4 text-sky-300" />
                  {displayContent.email}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={displayContent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  View Portfolio <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={displayContent.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  <Github className="h-4 w-4" /> GitHub
                </a>
                <a
                  href={displayContent.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                {displayContent.stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                    <div className="text-2xl font-black text-white sm:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-sky-950/30">
                <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-sky-400/15 to-amber-400/10 blur-2xl" />
                <img
                  src={displayContent.profileImage}
                  alt={displayContent.name}
                  className="aspect-[4/5] w-full rounded-[1.55rem] object-cover bg-slate-900"
                  onError={(event) => {
                    event.currentTarget.src = 'https://avatars.githubusercontent.com/u/94120325?v=4';
                  }}
                />
                <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur">
                  <div className="text-sm font-black tracking-wide text-white">M. MUBEEN EJAZ</div>
                  <div className="mt-1 text-xs text-slate-300">Full-Stack · AI · Cloud · Systems</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <section>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">// 001 — Expertise</div>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Technical Expertise</h2>
            </div>
            <TerminalSquare className="hidden h-10 w-10 text-slate-600 sm:block" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {displayContent.skills.map((group) => {
              const Icon = skillIcon[group.icon] || Code2;
              return (
                <article
                  key={group.category}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-sky-400/25 hover:bg-white/[0.055]"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{group.category}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{group.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
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
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">// 002 — Selected work</div>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Featured Projects</h2>
            <p className="mt-3 max-w-3xl text-slate-400">
              Production systems spanning SaaS, AI/ML, real-time communication, portals and automation.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {displayContent.projects.map((project) => (
              <article
                key={project.name}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-6 transition hover:border-white/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
                      {project.badge}
                    </span>
                    <h3 className="mt-4 text-2xl font-black">{project.name}</h3>
                  </div>
                  <Rocket className="h-6 w-6 text-slate-500 transition group-hover:text-sky-300" />
                </div>

                <p className="mt-4 leading-7 text-slate-400">{project.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span key={tech} className="rounded-lg bg-slate-950/70 px-2.5 py-1.5 text-xs font-semibold text-slate-300">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {project.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-sky-300" />
                      {highlight}
                    </div>
                  ))}
                </div>

                {(project.live || project.github) && (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-sky-300"
                      >
                        Live project <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"
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

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-3 text-sky-300">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Education</span>
            </div>
            {displayContent.education.map((edu) => (
              <div key={edu.degree} className="mt-6">
                <h3 className="text-2xl font-black">{edu.degree}</h3>
                <p className="mt-2 font-bold text-amber-300">{edu.institution}</p>
                <p className="mt-1 text-sm text-slate-500">{edu.year}</p>
                <p className="mt-4 leading-7 text-slate-400">{edu.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-3 text-amber-300">
              <Award className="h-6 w-6" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Highlights</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {displayContent.achievements.map((item, index) => (
                <div key={item} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-xs font-black text-sky-300">0{index + 1}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-white/[0.04] to-amber-400/10 p-7 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2 text-sky-300">
                <BriefcaseBusiness className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Build something useful</span>
              </div>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">Let&apos;s work together.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                For full-stack development, AI integrations, SaaS products, backend architecture or deployment work, reach out through the portfolio or email.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href={"mailto:" + displayContent.email}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                <Mail className="h-4 w-4" /> Email
              </a>
              <a
                href={displayContent.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
              >
                <Globe2 className="h-4 w-4" /> Portfolio
              </a>
            </div>
          </div>
        </section>

        {loading && (
          <div className="sr-only" aria-live="polite">
            Loading developer profile
          </div>
        )}
      </main>
    </div>
  );
};

export default DeveloperPage;
