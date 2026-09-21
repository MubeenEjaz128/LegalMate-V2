/**
 * ============================================================
 *  LegalMate — Unified Database Seeder
 *  Seeds the ENTIRE website with realistic dummy data.
 *  Run:  node seed.js
 * ============================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ── Models ──────────────────────────────────────────────────
const User            = require('./models/User');
const UserBalance     = require('./models/UserBalance');
const WalletTransaction = require('./models/WalletTransaction');
const Appointment     = require('./models/Appointment');
const Feedback        = require('./models/Feedback');
const Blog            = require('./models/Blog');
const Service         = require('./models/Service');
const FAQ             = require('./models/FAQ');
const ContactMessage  = require('./models/ContactMessage');
const Conversation    = require('./models/Conversation');
const ChatMessage     = require('./models/ChatMessage');
const Notification    = require('./models/Notification');

// ── DB Connection (established inside seed()) ──────────────

// ── Date helpers (all dates relative to NOW) ────────────────
const daysAgo     = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(14, 0, 0, 0); return d; };
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(14, 0, 0, 0); return d; };
const randomDaysAgo = (min, max) => daysAgo(Math.floor(min + Math.random() * (max - min)));
const appointmentTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const randomHour  = () => pick(appointmentTimes);

// Track every generated appointment slot in-memory so the seeder can never
// violate Appointment's unique { lawyer, date, time } index.
const usedAppointmentSlots = new Set();
const reserveAppointmentSlot = (lawyerId, dateFactory) => {
    for (let attempt = 0; attempt < 50; attempt++) {
        const date = dateFactory();
        for (const time of shuffle(appointmentTimes)) {
            const key = `${lawyerId.toString()}|${date.getTime()}|${time}`;
            if (!usedAppointmentSlots.has(key)) {
                usedAppointmentSlots.add(key);
                return { date, time };
            }
        }
    }
    throw new Error(`Unable to reserve a unique appointment slot for lawyer ${lawyerId}`);
};

// ── Utility ─────────────────────────────────────────────────
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const generatePhone    = () => `+92-3${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
const generateBarNumber = () => `BAR-${Math.floor(10000 + Math.random() * 90000)}`;

const hashPassword = async (pw) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(pw, salt);
};

// ═══════════════════════════════════════════════════════════
//  1.  LAWYER DATA  (40 lawyers — 8 per specialization)
// ═══════════════════════════════════════════════════════════
const specializations = ['Criminal Law', 'Civil Law', 'Corporate Law', 'Family Law', 'Tax Law'];

const lawyers = [
    // ── Criminal Law (8) ─────────────────────────────────
    { name: 'Ahmed Hassan Khan',       email: 'ahmed.hassan.legal@gmail.com',      city: 'Lahore',      area: 'DHA Phase 5',        exp: 15, rate: 4500, bio: 'Senior criminal defense attorney with 15 years of experience. Specialized in high-profile cases and white-collar crimes.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },
    { name: 'Imran Javed Malik',       email: 'imran.javed.advocate@gmail.com',    city: 'Karachi',     area: 'Clifton Block 5',    exp: 12, rate: 4000, bio: 'Experienced criminal lawyer specializing in cyber crime, fraud, and financial crime cases across Sindh.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },
    { name: 'Hassan Raza Javed',       email: 'hassan.raza.legal@gmail.com',       city: 'Islamabad',   area: 'Bahria Town Phase 7',exp: 8,  rate: 2800, bio: 'Criminal defense lawyer with 8 years of experience in various criminal cases.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },
    { name: 'Hira Shahid Akram',       email: 'hira.shahid.advocate@gmail.com',    city: 'Faisalabad',  area: 'Peoples Colony',     exp: 4,  rate: 1800, bio: 'Criminal defense attorney with 4 years of experience. Active in district and sessions courts.', spec: 'Criminal Law', lang: ['English', 'Urdu', 'Punjabi'] },
    { name: 'Tariq Mehmood Shah',      email: 'tariq.mehmood.law@outlook.com',     city: 'Rawalpindi',  area: 'Saddar',             exp: 18, rate: 5000, bio: 'Renowned criminal lawyer with 18 years handling murder, drug, and terrorism cases. High Court certified.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },
    { name: 'Rabia Noor Butt',         email: 'rabia.noor.legal@gmail.com',        city: 'Lahore',      area: 'Model Town',         exp: 6,  rate: 2200, bio: 'Criminal law practitioner focused on juvenile justice and women rights cases.', spec: 'Criminal Law', lang: ['English', 'Urdu', 'Punjabi'] },
    { name: 'Zain Abbas Qureshi',      email: 'zain.abbas.advocate@yahoo.com',     city: 'Multan',      area: 'Cantt Area',         exp: 10, rate: 3200, bio: 'Criminal defense specialist with expertise in bail applications, appeals, and trial advocacy.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },
    { name: 'Maryam Aslam Raza',       email: 'maryam.aslam.law@gmail.com',       city: 'Peshawar',    area: 'University Town',    exp: 5,  rate: 2000, bio: 'Young criminal lawyer with strong track record in cyber crime and financial fraud defense.', spec: 'Criminal Law', lang: ['English', 'Urdu'] },

    // ── Civil Law (8) ────────────────────────────────────
    { name: 'Ayesha Riaz Butt',        email: 'ayesha.riaz.law@gmail.com',         city: 'Lahore',      area: 'Model Town',         exp: 14, rate: 3800, bio: 'Civil litigation expert with 14 years of experience in property disputes and contract law.', spec: 'Civil Law', lang: ['English', 'Urdu', 'Punjabi'] },
    { name: 'Faisal Javed Malik',      email: 'faisal.javed.advocate@yahoo.com',   city: 'Multan',      area: 'Cantt Area',         exp: 4,  rate: 1700, bio: 'Civil litigation lawyer with 4 years of practice in property matters.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Zainab Hassan Rauf',      email: 'zainab.hassan.legal@yahoo.com',     city: 'Karachi',     area: 'DHA Phase 6',        exp: 6,  rate: 2600, bio: 'Civil law practitioner with 6 years of experience in property and contract disputes.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Saad Iqbal Mahmood',      email: 'saad.iqbal.law@gmail.com',          city: 'Islamabad',   area: 'F-10 Markaz',        exp: 11, rate: 3500, bio: 'Senior civil litigation attorney specializing in land revenue, property title, and tenancy disputes.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Sidra Shah Farooq',       email: 'sidra.shah.advocate@outlook.com',   city: 'Lahore',      area: 'Gulberg III',        exp: 7,  rate: 2400, bio: 'Civil law expert handling consumer disputes, rent tribunals, and recovery suits.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Arslan Tariq Butt',       email: 'arslan.tariq.law@gmail.com',        city: 'Faisalabad',  area: 'Gulberg',            exp: 9,  rate: 2800, bio: 'Civil litigation specialist with focus on commercial disputes and debt recovery.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Nida Riaz Khan',          email: 'nida.riaz.civil@outlook.com',       city: 'Rawalpindi',  area: 'Satellite Town',     exp: 3,  rate: 1600, bio: 'Civil law associate handling succession, partition, and specific performance cases.', spec: 'Civil Law', lang: ['English', 'Urdu'] },
    { name: 'Hamza Ali Sheikh',        email: 'hamza.ali.advocate@gmail.com',      city: 'Karachi',     area: 'North Nazimabad',    exp: 16, rate: 4200, bio: 'Veteran civil lawyer with 16 years in High Court litigation including constitutional petitions.', spec: 'Civil Law', lang: ['English', 'Urdu'] },

    // ── Corporate Law (8) ────────────────────────────────
    { name: 'Muhammad Tariq Siddiqui', email: 'm.tariq.corporate@yahoo.com',       city: 'Islamabad',   area: 'F-7 Markaz',         exp: 18, rate: 5000, bio: 'Corporate law specialist with 18 years of experience in mergers, acquisitions, and corporate governance.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Bilal Ahmad Mahmood',     email: 'bilal.ahmad.advocate@gmail.com',    city: 'Karachi',     area: 'Gulshan-e-Iqbal',    exp: 9,  rate: 3200, bio: 'Corporate lawyer with 9 years of experience in business law and contracts.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Nida Riaz Khan',          email: 'nida.riaz.legal@gmail.com',         city: 'Faisalabad',  area: 'Samanabad',          exp: 5,  rate: 2000, bio: 'Corporate lawyer with 5 years of experience in startup and SME legal matters.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Ali Raza Chaudhry',       email: 'ali.raza.corporate@gmail.com',      city: 'Lahore',      area: 'Johar Town',         exp: 13, rate: 4200, bio: 'SECP compliance expert and corporate lawyer handling IPOs, securities law, and shareholder agreements.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Sara Naveed Malik',       email: 'sara.naveed.law@outlook.com',       city: 'Karachi',     area: 'Clifton Block 8',    exp: 7,  rate: 2800, bio: 'Corporate attorney specializing in fintech regulations, startup advisory, and venture capital deals.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Fahad Hussain Raza',      email: 'fahad.hussain.legal@yahoo.com',     city: 'Islamabad',   area: 'G-11/3',             exp: 10, rate: 3500, bio: 'Corporate governance and company secretarial specialist with 10 years of practice.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Mehak Fatima Amin',       email: 'mehak.fatima.advocate@gmail.com',   city: 'Lahore',      area: 'DHA Phase 3',        exp: 3,  rate: 1800, bio: 'Junior corporate lawyer assisting in company registrations, MOUs, and joint ventures.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },
    { name: 'Junaid Akram Butt',       email: 'junaid.akram.law@hotmail.com',      city: 'Multan',      area: 'Gulgasht Colony',    exp: 8,  rate: 2600, bio: 'Corporate and commercial lawyer with focus on banking law and trade finance.', spec: 'Corporate Law', lang: ['English', 'Urdu'] },

    // ── Family Law (8) ───────────────────────────────────
    { name: 'Fatima Noor Malik',       email: 'fatima.noor.advocate@outlook.com',  city: 'Karachi',     area: 'Clifton Block 8',    exp: 12, rate: 4000, bio: 'Expert family law attorney with 12 years of practice. Specializing in divorce, custody, and inheritance matters.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Sana Tariq Amin',         email: 'sana.tariq.law@outlook.com',        city: 'Lahore',      area: 'Johar Town',         exp: 7,  rate: 2500, bio: 'Family law attorney with 7 years of practice in divorce and custody matters.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Asad Mehmood Butt',       email: 'asad.mehmood.law@outlook.com',      city: 'Multan',      area: 'Model Town',         exp: 3,  rate: 1600, bio: 'Family law practitioner with 3 years of experience in matrimonial cases.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Khadija Amin Raza',       email: 'khadija.amin.law@gmail.com',        city: 'Islamabad',   area: 'E-11/4',             exp: 15, rate: 4500, bio: 'Senior family lawyer and mediator with 15 years handling khula, divorce, maintenance, and guardianship cases.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Umar Farooq Sheikh',      email: 'umar.farooq.advocate@yahoo.com',    city: 'Rawalpindi',  area: 'Bahria Town Phase 4',exp: 6,  rate: 2200, bio: 'Family and matrimonial lawyer handling dower rights, nikah disputes, and child custody matters.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Aisha Mumtaz Khan',       email: 'aisha.mumtaz.law@outlook.com',      city: 'Lahore',      area: 'Gulberg II',         exp: 10, rate: 3400, bio: 'Family law specialist with expertise in inheritance partition, wills, and succession certificates.', spec: 'Family Law', lang: ['English', 'Urdu', 'Punjabi'] },
    { name: 'Waqar Ahmed Siddiqui',    email: 'waqar.ahmed.legal@gmail.com',       city: 'Karachi',     area: 'DHA Phase 5',        exp: 8,  rate: 2800, bio: 'Family court practitioner with strong track record in alimony negotiations and visitation rights cases.', spec: 'Family Law', lang: ['English', 'Urdu'] },
    { name: 'Laiba Usman Zaheer',      email: 'laiba.usman.advocate@gmail.com',    city: 'Faisalabad',  area: 'Model Town',         exp: 4,  rate: 1800, bio: 'Junior family lawyer working pro-bono cases for women and children\'s rights.', spec: 'Family Law', lang: ['English', 'Urdu'] },

    // ── Tax Law (8) ──────────────────────────────────────
    { name: 'Usman Ali Sheikh',        email: 'usman.sheikh.advocate@hotmail.com', city: 'Lahore',      area: 'Gulberg III',        exp: 13, rate: 4200, bio: 'Tax law specialist with 13 years of experience in FBR matters and tax dispute resolution.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Kamran Iqbal Shah',       email: 'kamran.iqbal.law@gmail.com',        city: 'Islamabad',   area: 'G-11/3',             exp: 8,  rate: 2900, bio: 'Tax consultant and lawyer with 8 years of experience in tax planning and compliance.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Amna Tariq Aziz',         email: 'amna.tariq.law@gmail.com',          city: 'Faisalabad',  area: 'Gulberg',            exp: 3,  rate: 1900, bio: 'Tax law associate with 3 years of experience in tax compliance and advisory.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Shahzad Hussain Rana',    email: 'shahzad.hussain.tax@gmail.com',     city: 'Karachi',     area: 'Gulshan-e-Iqbal',    exp: 16, rate: 4800, bio: 'Senior tax attorney and FBR panel member with 16 years in income tax, sales tax, and customs litigation.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Sadia Noor Chaudhry',     email: 'sadia.noor.tax@outlook.com',        city: 'Lahore',      area: 'DHA Phase 1',        exp: 9,  rate: 3200, bio: 'Tax planning expert for corporations and HNW individuals. Handles FBR audits and appeals.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Naveed Iqbal Raza',       email: 'naveed.iqbal.legal@yahoo.com',      city: 'Islamabad',   area: 'I-8/2',              exp: 7,  rate: 2600, bio: 'Tax lawyer specializing in cross-border transactions, transfer pricing, and international tax treaties.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Hina Farooq Malik',       email: 'hina.farooq.tax@gmail.com',         city: 'Rawalpindi',  area: 'Satellite Town',     exp: 5,  rate: 2200, bio: 'Tax compliance and advisory lawyer for SMEs and startups. Expert in tax filing and registration.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
    { name: 'Talha Mahmood Butt',      email: 'talha.mahmood.law@outlook.com',     city: 'Multan',      area: 'Shah Rukn-e-Alam',   exp: 11, rate: 3600, bio: 'Experienced tax attorney handling agricultural income tax, property tax, and provincial revenue matters.', spec: 'Tax Law', lang: ['English', 'Urdu'] },
];

// ═══════════════════════════════════════════════════════════
//  2.  CLIENT DATA  (30 clients)
// ═══════════════════════════════════════════════════════════
const clients = [
    { name: 'Waqas Ahmed Siddiqui',   email: 'waqas.ahmed72@gmail.com',            city: 'Lahore',    area: 'DHA Phase 3' },
    { name: 'Mahnoor Ali Raza',        email: 'mahnoor.ali.pk@outlook.com',         city: 'Karachi',   area: 'Clifton Block 2' },
    { name: 'Rizwan Shah Hussain',     email: 'rizwan.shah.business@yahoo.com',     city: 'Islamabad', area: 'Blue Area' },
    { name: 'Aliza Rauf Nadeem',       email: 'aliza.rauf93@gmail.com',             city: 'Lahore',    area: 'Model Town' },
    { name: 'Naveed Akram Sheikh',     email: 'naveed.akram.dev@hotmail.com',       city: 'Karachi',   area: 'Bahria Town' },
    { name: 'Saira Aziz Khan',         email: 'saira.aziz.pk@gmail.com',            city: 'Lahore',    area: 'Johar Town' },
    { name: 'Adnan Farooq Malik',      email: 'adnan.farooq.business@outlook.com',  city: 'Islamabad', area: 'F-10 Markaz' },
    { name: 'Laiba Usman Tariq',       email: 'laiba.usman88@yahoo.com',            city: 'Lahore',    area: 'Gulberg II' },
    { name: 'Zara Imran Butt',         email: 'zara.imran.pk@gmail.com',            city: 'Karachi',   area: 'DHA Phase 5' },
    { name: 'Hafsa Nadeem Ali',        email: 'hafsa.nadeem92@outlook.com',          city: 'Islamabad', area: 'G-13/2' },
    { name: 'Shahzad Hussain Raza',    email: 'shahzad.hussain.tech@gmail.com',      city: 'Faisalabad',area: 'Peoples Colony' },
    { name: 'Sidra Butt Amin',         email: 'sidra.butt.design@yahoo.com',         city: 'Multan',    area: 'Model Town' },
    { name: 'Anum Zaheer Khan',        email: 'anum.zaheer.pk@gmail.com',            city: 'Lahore',    area: 'Samanabad' },
    { name: 'Nimra Akram Sheikh',      email: 'nimra.akram91@hotmail.com',           city: 'Rawalpindi',area: 'Cantt Area' },
    { name: 'Khadija Amin Tariq',      email: 'khadija.amin.edu@outlook.com',        city: 'Lahore',    area: 'Gulberg III' },
    { name: 'Umar Hassan Farooq',      email: 'umar.hassan.pk@gmail.com',            city: 'Karachi',   area: 'Gulshan-e-Iqbal' },
    { name: 'Fatima Zahra Malik',      email: 'fatima.zahra91@outlook.com',           city: 'Islamabad', area: 'F-7 Markaz' },
    { name: 'Bilal Raza Chaudhry',     email: 'bilal.raza.biz@gmail.com',            city: 'Lahore',    area: 'DHA Phase 6' },
    { name: 'Saba Noor Hussain',       email: 'saba.noor.pk@yahoo.com',              city: 'Faisalabad',area: 'Gulberg' },
    { name: 'Asim Javed Khan',         email: 'asim.javed.tech@gmail.com',            city: 'Multan',    area: 'Gulgasht Colony' },
    { name: 'Mehwish Ali Raza',        email: 'mehwish.ali.art@outlook.com',           city: 'Rawalpindi',area: 'Bahria Town Phase 4' },
    { name: 'Farhan Akbar Sheikh',     email: 'farhan.akbar.pk@gmail.com',             city: 'Karachi',   area: 'North Nazimabad' },
    { name: 'Ayesha Noor Butt',        email: 'ayesha.noor.fashion@gmail.com',         city: 'Lahore',    area: 'Bahria Town' },
    { name: 'Hassan Mehmood Iqbal',    email: 'hassan.mehmood.pk@yahoo.com',           city: 'Islamabad', area: 'I-8/2' },
    { name: 'Rabia Tariq Aziz',        email: 'rabia.tariq.writer@outlook.com',         city: 'Faisalabad',area: 'Model Town' },
    { name: 'Kamran Ali Butt',         email: 'kamran.ali.trade@gmail.com',             city: 'Lahore',    area: 'Gulberg I' },
    { name: 'Noor Fatima Shah',        email: 'noor.fatima.pk@yahoo.com',               city: 'Multan',    area: 'Bosan Road' },
    { name: 'Talha Farooq Raza',       email: 'talha.farooq.dev@gmail.com',             city: 'Rawalpindi',area: 'Saddar' },
    { name: 'Saman Zaidi Noor',        email: 'saman.zaidi.pk@outlook.com',             city: 'Karachi',   area: 'DHA Phase 2' },
    { name: 'Danish Iqbal Shah',       email: 'danish.iqbal.biz@gmail.com',              city: 'Islamabad', area: 'E-11/4' },
];

// ═══════════════════════════════════════════════════════════
//  3.  SERVICES  (12)
// ═══════════════════════════════════════════════════════════
const services = [
    { title: 'Legal Consultation',      description: 'Get expert legal advice from experienced attorneys. One-on-one consultation sessions to discuss your legal matters.', icon: 'MessageSquare', features: ['30-60 minute sessions', 'Video or chat consultation', 'Confidential advice', 'Follow-up support'], order: 1 },
    { title: 'Document Review',         description: 'Professional review and analysis of legal documents. Ensure your contracts and agreements are legally sound.', icon: 'FileText', features: ['Thorough document analysis', 'Legal compliance check', 'Suggestions for improvements', 'Quick turnaround time'], order: 2 },
    { title: 'Contract Drafting',       description: 'Custom contract preparation tailored to your specific needs. Legally binding agreements drafted by experts.', icon: 'FileEdit', features: ['Customized contracts', 'Industry-specific templates', 'Revision support', 'Legal compliance guaranteed'], order: 3 },
    { title: 'Corporate Law Services',  description: 'Comprehensive corporate legal support for businesses. From company formation to compliance management.', icon: 'Building', features: ['Company registration', 'Compliance management', 'Board resolutions', 'Corporate governance'], order: 4 },
    { title: 'Family Law Matters',      description: 'Sensitive handling of family legal issues. Expert guidance on divorce, custody, and inheritance matters.', icon: 'Users', features: ['Divorce proceedings', 'Child custody', 'Inheritance disputes', 'Family settlements'], order: 5 },
    { title: 'Property & Real Estate',  description: 'Complete legal support for property transactions. Title verification, sale agreements, and dispute resolution.', icon: 'Home', features: ['Title verification', 'Sale/purchase agreements', 'Property disputes', 'Lease agreements'], order: 6 },
    { title: 'Criminal Defense',        description: 'Strong legal defense for criminal cases. Experienced attorneys to protect your rights and freedom.', icon: 'Shield', features: ['Case analysis', 'Court representation', 'Bail applications', 'Appeal services'], order: 7 },
    { title: 'Civil Litigation',        description: 'Expert representation in civil disputes. Comprehensive litigation support from filing to resolution.', icon: 'Scale', features: ['Case preparation', 'Court representation', 'Settlement negotiations', 'Appeal handling'], order: 8 },
    { title: 'Tax & Financial Law',     description: 'Navigate complex tax regulations with expert guidance. Tax planning, compliance, and dispute resolution.', icon: 'Calculator', features: ['Tax planning', 'FBR compliance', 'Tax dispute resolution', 'Financial advisory'], order: 9 },
    { title: 'Intellectual Property',   description: 'Protect your creative and business assets. Trademark, copyright, and patent registration and enforcement.', icon: 'Lightbulb', features: ['Trademark registration', 'Copyright protection', 'Patent filing', 'IP litigation'], order: 10 },
    { title: 'Employment Law',          description: 'Legal support for workplace matters. Employment contracts, disputes, and labor law compliance.', icon: 'Briefcase', features: ['Employment contracts', 'Workplace disputes', 'Termination matters', 'Labor law compliance'], order: 11 },
    { title: 'Power of Attorney',       description: 'Legal authorization documents for representation. General and special power of attorney services.', icon: 'FileSignature', features: ['General POA', 'Special POA', 'Notarization', 'Attestation services'], order: 12 },
];

// ═══════════════════════════════════════════════════════════
//  4.  FAQs  (30)
// ═══════════════════════════════════════════════════════════
const faqs = [
    { q: 'What is LegalMate?', a: 'LegalMate is Pakistan\'s premier online legal services platform connecting clients with verified lawyers. We provide convenient access to legal consultation through video calls and chat.', cat: 'General', o: 1 },
    { q: 'How does LegalMate work?', a: 'Create an account, browse verified lawyers by specialization, book a consultation at your preferred time, and connect through our secure platform. Payment is handled through our wallet system.', cat: 'General', o: 2 },
    { q: 'Is LegalMate available across Pakistan?', a: 'Yes! LegalMate serves clients across all major cities including Lahore, Karachi, Islamabad, Faisalabad, Multan, and more.', cat: 'General', o: 3 },
    { q: 'Are the lawyers verified?', a: 'All lawyers undergo strict verification — bar council licenses, educational credentials, and professional experience are checked before approval.', cat: 'General', o: 4 },
    { q: 'Can I get legal advice in Urdu?', a: 'Yes! Most lawyers are fluent in both English and Urdu. You can filter by language preference.', cat: 'General', o: 5 },
    { q: 'How do I create an account?', a: 'Click "Sign Up", choose client or lawyer, fill in your details, create a password, and verify your email.', cat: 'Account', o: 6 },
    { q: 'I forgot my password. What should I do?', a: 'Click "Forgot Password" on login, enter your email, and follow the reset link sent to your inbox.', cat: 'Account', o: 7 },
    { q: 'How do I update my profile?', a: 'Log in → Profile Settings → update your information → Save Changes.', cat: 'Account', o: 8 },
    { q: 'Is my information kept confidential?', a: 'Yes. All communications are protected by attorney-client privilege with industry-standard encryption.', cat: 'Account', o: 9 },
    { q: 'Can I use LegalMate on mobile?', a: 'Absolutely! The platform is fully responsive and works on all mobile devices through any modern browser.', cat: 'Account', o: 10 },
    { q: 'How do I book an appointment?', a: 'Browse lawyers → select one → pick a time slot → confirm → pay through your wallet. You\'ll receive a confirmation email.', cat: 'Appointments', o: 11 },
    { q: 'Can I cancel or reschedule?', a: 'Yes. Cancel before the appointment starts. Rescheduling depends on lawyer availability. Refunds follow our refund policy.', cat: 'Appointments', o: 12 },
    { q: 'How do I join a video consultation?', a: 'At appointment time go to "My Appointments" → click the active appointment → "Join Video Call". Ensure stable internet and camera access.', cat: 'Appointments', o: 13 },
    { q: 'Can I have chat instead of video?', a: 'Yes! Choose between video or chat consultation when booking based on your preference.', cat: 'Appointments', o: 14 },
    { q: 'How do I prepare for consultation?', a: 'Gather relevant documents, list your questions, prepare a situation summary, and ensure a quiet space with good internet.', cat: 'Appointments', o: 15 },
    { q: 'How does the wallet system work?', a: 'Add funds via JazzCash, Easypaisa, bank transfer, or card. Consultation fees are deducted from your wallet balance on booking.', cat: 'Payments', o: 16 },
    { q: 'What payment methods are accepted?', a: 'Bank transfers, JazzCash, Easypaisa, NayaPay, and credit/debit cards — all secure and encrypted.', cat: 'Payments', o: 17 },
    { q: 'How do I add money to my wallet?', a: 'Go to "My Wallet" → "Add Balance" → enter amount → choose method → complete transaction. Listed instantly after admin approval.', cat: 'Payments', o: 18 },
    { q: 'Can I get a refund?', a: 'Yes. Approved refunds go back to your wallet. You can use the balance for future bookings or withdraw to your bank.', cat: 'Payments', o: 19 },
    { q: 'How long do refunds take?', a: 'Requests are reviewed in 24-48 hrs. Wallet credit is instant on approval; bank withdrawals take 3-5 business days.', cat: 'Payments', o: 20 },
    { q: 'Are there transaction fees?', a: 'LegalMate charges no transaction fees. Your payment provider (bank, JazzCash, etc.) may apply their own charges.', cat: 'Payments', o: 21 },
    { q: 'What areas of law are covered?', a: 'Criminal, civil, corporate, family, property, tax, intellectual property, employment, and more.', cat: 'Legal Services', o: 22 },
    { q: 'Can I get help with document drafting?', a: 'Yes! Many lawyers offer contracts, agreements, wills, POA, and legal notice drafting.', cat: 'Legal Services', o: 23 },
    { q: 'Do lawyers handle court cases?', a: 'Yes. After initial consultation your lawyer can represent you in court if needed.', cat: 'Legal Services', o: 24 },
    { q: 'Can I get legal advice for my business?', a: 'Absolutely. Corporate lawyers specialize in formation, contracts, compliance, and commercial disputes.', cat: 'Legal Services', o: 25 },
    { q: 'What browsers are supported?', a: 'Chrome, Firefox, Safari, and Edge. Keep your browser up to date for the best experience.', cat: 'Technical', o: 26 },
    { q: 'Why can\'t I join the video call?', a: 'Check internet, enable camera/mic permissions, refresh the page, or try another browser.', cat: 'Technical', o: 27 },
    { q: 'The website is slow — what should I do?', a: 'Clear cache/cookies, check internet speed, try another browser, or disable interfering extensions.', cat: 'Technical', o: 28 },
    { q: 'How do I enable camera and mic?', a: 'When prompted click "Allow". You can also enable them in browser settings under site permissions.', cat: 'Technical', o: 29 },
    { q: 'Can I record the consultation?', a: 'Recording requires consent from both parties. Discuss with your lawyer beforehand. Unauthorized recording may violate privacy law.', cat: 'Technical', o: 30 },
];

// ═══════════════════════════════════════════════════════════
//  5.  BLOG TOPICS  (40 — 8 per category)
// ═══════════════════════════════════════════════════════════
const blogTopics = [
    // Legal Advice (8)
    { title: 'Understanding Property Tax Laws in Pakistan', category: 'Legal Advice', tags: ['Property', 'Tax', 'Real Estate'] },
    { title: 'Complete Guide to Divorce Proceedings in Pakistan', category: 'Legal Advice', tags: ['Family Law', 'Divorce', 'Legal Process'] },
    { title: 'How to Register Your Business in Pakistan', category: 'Legal Advice', tags: ['Corporate', 'Business', 'Registration'] },
    { title: 'Employment Contract Essentials Every Worker Should Know', category: 'Legal Advice', tags: ['Employment', 'Contracts', 'Workers Rights'] },
    { title: 'Inheritance Laws in Pakistan: A Comprehensive Guide', category: 'Legal Advice', tags: ['Inheritance', 'Family Law', 'Estate'] },
    { title: 'Understanding Cyber Crime Laws in Pakistan', category: 'Legal Advice', tags: ['Cyber Crime', 'Digital Law', 'PECA'] },
    { title: 'How to File a First Information Report (FIR)', category: 'Legal Advice', tags: ['FIR', 'Criminal Law', 'Police'] },
    { title: 'Intellectual Property Protection for Startups', category: 'Legal Advice', tags: ['IP', 'Startups', 'Business'] },

    // Case Studies (8)
    { title: 'Landmark Property Dispute Case: Lessons Learned', category: 'Case Studies', tags: ['Property', 'Case Study', 'Dispute'] },
    { title: 'Successful Corporate Merger: Legal Perspective', category: 'Case Studies', tags: ['Corporate', 'Merger', 'Case Study'] },
    { title: 'High-Profile Divorce Settlement Analysis', category: 'Case Studies', tags: ['Divorce', 'Settlement', 'Family Law'] },
    { title: 'Cyber Crime Prosecution Success Story', category: 'Case Studies', tags: ['Cyber Crime', 'Prosecution', 'Success'] },
    { title: 'Consumer Rights Victory Against a Corporation', category: 'Case Studies', tags: ['Consumer Rights', 'Victory', 'Case'] },
    { title: 'Trademark Infringement Case Won', category: 'Case Studies', tags: ['Trademark', 'Infringement', 'Victory'] },
    { title: 'Employment Discrimination Case — Justice Served', category: 'Case Studies', tags: ['Discrimination', 'Employment', 'Victory'] },
    { title: 'Tax Evasion Case: Consequences and Lessons', category: 'Case Studies', tags: ['Tax', 'Evasion', 'Case Study'] },

    // News (8)
    { title: 'New Tax Reforms Announced for the Current Year', category: 'News', tags: ['Tax', 'Reforms', 'FBR'] },
    { title: 'Supreme Court Ruling on Digital Privacy Rights', category: 'News', tags: ['Supreme Court', 'Privacy', 'Ruling'] },
    { title: 'Amendment in Property Transfer Laws', category: 'News', tags: ['Property', 'Amendment', 'Law'] },
    { title: 'Labour Law Reforms: What Changed This Year', category: 'News', tags: ['Labour', 'Reforms', 'Employment'] },
    { title: 'Consumer Protection Laws Enhanced', category: 'News', tags: ['Consumer', 'Protection', 'Enhanced'] },
    { title: 'Data Protection Bill Introduced in Parliament', category: 'News', tags: ['Data Protection', 'Bill', 'Privacy'] },
    { title: 'Court Fee Structure Updated Nationwide', category: 'News', tags: ['Court', 'Fees', 'Update'] },
    { title: 'Legal Aid Services Expanded Across Pakistan', category: 'News', tags: ['Legal Aid', 'Services', 'Expanded'] },

    // Tips (8)
    { title: '10 Tips for Choosing the Right Lawyer', category: 'Tips', tags: ['Lawyer', 'Tips', 'Selection'] },
    { title: '5 Things to Check Before Buying Property', category: 'Tips', tags: ['Property', 'Buying', 'Tips'] },
    { title: 'How to Prepare for Your First Legal Consultation', category: 'Tips', tags: ['Consultation', 'Preparation', 'Tips'] },
    { title: '7 Ways to Protect Your Business Legally', category: 'Tips', tags: ['Business', 'Protection', 'Tips'] },
    { title: 'Essential Documents for Property Purchase', category: 'Tips', tags: ['Property', 'Documents', 'Tips'] },
    { title: 'Tips for Effective Contract Negotiation', category: 'Tips', tags: ['Contract', 'Negotiation', 'Tips'] },
    { title: 'How to Document Legal Evidence Properly', category: 'Tips', tags: ['Evidence', 'Documentation', 'Tips'] },
    { title: 'Essential Tips for Tax Planning in Pakistan', category: 'Tips', tags: ['Tax', 'Planning', 'Tips'] },

    // General (8)
    { title: 'How Technology is Transforming Legal Services', category: 'General', tags: ['Technology', 'Legal', 'Innovation'] },
    { title: 'Understanding the Pakistani Legal System', category: 'General', tags: ['Legal System', 'Pakistan', 'Overview'] },
    { title: 'Legal Rights Every Citizen Should Know', category: 'General', tags: ['Rights', 'Citizens', 'Awareness'] },
    { title: 'Common Legal Myths Debunked', category: 'General', tags: ['Myths', 'Legal', 'Facts'] },
    { title: 'The Importance of Legal Documentation', category: 'General', tags: ['Documentation', 'Importance', 'Legal'] },
    { title: 'Women and Legal Rights in Pakistan', category: 'General', tags: ['Women', 'Rights', 'Legal'] },
    { title: 'Understanding Constitutional Rights in Pakistan', category: 'General', tags: ['Constitution', 'Rights', 'Understanding'] },
    { title: 'The Future of Legal Practice in Pakistan', category: 'General', tags: ['Future', 'Legal Practice', 'Pakistan'] },
];

// Blog content generator
function generateBlogContent(title) {
    const intros = [
        `In today's complex legal landscape, understanding the topic of "${title.toLowerCase()}" has become more important than ever. This comprehensive guide walks you through everything you need to know.`,
        `"${title}" is a subject that affects many individuals and businesses across Pakistan. In this article we explore the key aspects and provide practical insights.`,
        `Navigating the legal complexities around "${title.toLowerCase()}" can be challenging. This article aims to demystify the subject and provide clear, actionable guidance.`,
    ];
    const body = `\n\nThe legal framework surrounding this area has evolved significantly over the years. Recent amendments and court rulings have shaped how we approach these matters today. Staying informed about developments is essential to ensure compliance and protect your rights.\n\nKey considerations include understanding your legal obligations, knowing your rights, and being aware of the procedures involved. Professional legal advice is always recommended for complex situations.\n\nDocumentation plays a crucial role. Maintaining proper records, understanding timelines, and following due process can make a significant difference in outcomes. Many people overlook these important details, which can lead to complications.\n\nExperienced lawyers bring valuable expertise, helping navigate complex regulations and ensuring that all legal requirements are met. They provide strategic advice tailored to your specific situation.\n\nIn conclusion, staying informed and seeking professional guidance when needed are the best approaches to handling legal matters effectively. The investment in proper legal counsel often saves time, money, and stress in the long run.`;
    return pick(intros) + body;
}

// ═══════════════════════════════════════════════════════════
//  6.  CONTACT MESSAGES  (20)
// ═══════════════════════════════════════════════════════════
const contactSubjects = [
    'Inquiry about Legal Consultation', 'Question regarding Property Law',
    'Need help with Divorce Case', 'Business Registration Query',
    'Tax Law Consultation Request', 'Employment Contract Review',
    'Criminal Defense Inquiry', 'Family Law Matter',
    'Corporate Law Services', 'Real Estate Transaction Help',
    'Contract Drafting Request', 'Legal Document Review',
    'Court Representation Needed', 'Urgent Legal Assistance',
    'Feedback on Platform', 'Technical Support Request',
    'Payment Issue', 'Account Access Problem',
    'Lawyer Verification Query', 'Intellectual Property Protection',
];

// ═══════════════════════════════════════════════════════════
//  7.  FEEDBACK TEMPLATES
// ═══════════════════════════════════════════════════════════
const feedbackPool = [
    { r: 5.0, c: 'Excellent legal advice. Very professional and knowledgeable. Highly recommended!' },
    { r: 5.0, c: 'Outstanding service! The lawyer explained everything clearly and achieved a great outcome.' },
    { r: 4.9, c: 'Very thorough consultation. Explained all legal options and provided strategic advice.' },
    { r: 4.8, c: 'Great experience. The lawyer was responsive and handled the case with dedication.' },
    { r: 4.8, c: 'Professional and effective. Will definitely consult again for future matters.' },
    { r: 4.7, c: 'Very helpful consultation. The lawyer was patient and answered all my questions.' },
    { r: 4.5, c: 'Good legal counsel. Satisfied with the service and would recommend to others.' },
    { r: 4.5, c: 'Knowledgeable lawyer. Good experience overall with clear communication.' },
    { r: 4.3, c: 'Decent consultation. Got useful guidance on the legal procedure.' },
    { r: 4.2, c: 'Good service overall. Helpful lawyer with practical approach.' },
    { r: 4.0, c: 'Satisfactory service. Basic legal advice was helpful for my situation.' },
    { r: 4.0, c: 'Professional lawyer. Fair consultation. Met my expectations.' },
];

// ═══════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════
async function seed() {
    try {
        console.log('\n🌱 ═══════════════════════════════════════════');
        console.log('   LegalMate — Full Database Seeder');
        console.log('═══════════════════════════════════════════════\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legalmate', {});
        console.log('✅ Connected to MongoDB\n');

        // ── Admin check ──
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('❌ Admin user not found! Create an admin account first.');
            process.exit(1);
        }
        console.log(`✅ Admin found: ${admin.name} (${admin.email})\n`);

        // ── Wipe everything except admin ──
        console.log('🗑️  Clearing existing data (admin preserved)...');
        await Promise.all([
            User.deleteMany({ role: { $ne: 'admin' } }),
            UserBalance.deleteMany({}),
            WalletTransaction.deleteMany({}),
            Appointment.deleteMany({}),
            Feedback.deleteMany({}),
            Blog.deleteMany({}),
            Service.deleteMany({}),
            FAQ.deleteMany({}),
            ContactMessage.deleteMany({}),
            Conversation.deleteMany({}),
            ChatMessage.deleteMany({}),
            Notification.deleteMany({}),
        ]);
        console.log('   Done.\n');

        const hashedPassword = await hashPassword('Legal@12');

        // ══════════════════════════════════════════════
        //  A.  CREATE LAWYERS
        // ══════════════════════════════════════════════
        console.log('👨‍⚖️  Creating 40 lawyers...');
        const lawyerDocs = lawyers.map(l => new User({
            name: l.name,
            email: l.email,
            password: hashedPassword,
            phone: generatePhone(),
            address: `House ${Math.floor(1+Math.random()*200)}, Street ${Math.floor(1+Math.random()*50)}, ${l.area}, ${l.city}`,
            role: 'lawyer',
            isVerified: true,
            verificationStatus: 'approved',
            isActive: true,
            isAvailable: true,
            specialization: l.spec,
            barNumber: generateBarNumber(),
            hourlyRate: l.rate,
            bio: l.bio,
            languages: l.lang,
            level: l.exp >= 12 ? 3 : l.exp >= 8 ? 2 : l.exp >= 5 ? 1 : 0,
        }));
        const savedLawyers = await User.insertMany(lawyerDocs);
        console.log(`   ✅ ${savedLawyers.length} lawyers created.\n`);

        // ══════════════════════════════════════════════
        //  B.  CREATE CLIENTS
        // ══════════════════════════════════════════════
        console.log('👤 Creating 30 clients...');
        const clientDocs = clients.map(c => new User({
            name: c.name,
            email: c.email,
            password: hashedPassword,
            phone: generatePhone(),
            address: `House ${Math.floor(1+Math.random()*200)}, ${c.area}, ${c.city}`,
            role: 'client',
            isVerified: true,
            isActive: true,
        }));
        const savedClients = await User.insertMany(clientDocs);
        console.log(`   ✅ ${savedClients.length} clients created.\n`);

        // ══════════════════════════════════════════════
        //  C.  WALLET BALANCES (clients get 5000-15000 PKR)
        // ══════════════════════════════════════════════
        console.log('💰 Creating wallet balances...');
        for (const client of savedClients) {
            const amount = Math.floor(5000 + Math.random() * 10000); // 5000-15000
            await new UserBalance({ user: client._id, balancePkr: amount, totalDeposited: amount }).save();
            await new WalletTransaction({
                user: client._id,
                type: 'DEPOSIT',
                amountPkr: amount,
                balanceBefore: 0,
                balanceAfter: amount,
                reference: `INIT-${client._id}`,
                description: 'Initial system grant — Welcome bonus',
                metadata: { source: 'System Grant', grantType: 'Welcome Bonus', grantedAt: new Date() },
            }).save();
        }
        // Give lawyers some earned balances
        for (const lawyer of savedLawyers) {
            const earned = Math.floor(lawyer.hourlyRate * (0.5 + Math.random() * 5)); // some random earnings
            await new UserBalance({ user: lawyer._id, balancePkr: earned, totalEarned: earned }).save();
        }
        console.log('   ✅ Wallet balances created.\n');

        // ══════════════════════════════════════════════
        //  D.  PAST APPOINTMENTS + FEEDBACK
        // ══════════════════════════════════════════════
        console.log('📅 Creating past appointments & feedback...');
        let totalPast = 0;

        for (let li = 0; li < savedLawyers.length; li++) {
            const lawyer = savedLawyers[li];
            // Senior (level 3): 8-12 past, Mid (level 2): 5-8, Junior: 3-5, New: 1-3
            const level = lawyer.level;
            const count = level === 3 ? Math.floor(8 + Math.random() * 5)
                        : level === 2 ? Math.floor(5 + Math.random() * 4)
                        : level === 1 ? Math.floor(3 + Math.random() * 3)
                        :               Math.floor(1 + Math.random() * 3);

            let totalRating = 0;
            const usedClients = shuffle(savedClients).slice(0, count);

            for (let j = 0; j < count; j++) {
                const client = usedClients[j] || pick(savedClients);
                const { date: meetDate, time: meetTime } = reserveAppointmentSlot(
                    lawyer._id,
                    () => daysAgo(Math.floor(3 + Math.random() * 150)) // 3-152 days ago
                );

                // Higher-level lawyers get better feedback
                const fb = level >= 2 ? pick(feedbackPool.slice(0, 6))
                         : level === 1 ? pick(feedbackPool.slice(2, 9))
                         :               pick(feedbackPool.slice(5, 12));

                const appt = await new Appointment({
                    client: client._id,
                    lawyer: lawyer._id,
                    date: meetDate,
                    time: meetTime,
                    duration: 60,
                    consultationType: Math.random() > 0.3 ? 'video' : 'chat',
                    status: 'completed',
                    amount: lawyer.hourlyRate,
                    paymentStatus: 'paid',
                    feedback: { rating: fb.r, comment: fb.c, submittedAt: meetDate },
                }).save();

                await new Feedback({
                    client: client._id,
                    lawyer: lawyer._id,
                    appointment: appt._id,
                    rating: fb.r,
                    comment: fb.c,
                }).save();

                totalRating += fb.r;
                totalPast++;
            }

            // Update lawyer stats
            lawyer.consultationCount = count;
            lawyer.averageRating = parseFloat((totalRating / count).toFixed(1));
            lawyer.reviewCount = count;
            await lawyer.save();
        }
        console.log(`   ✅ ${totalPast} past appointments with feedback created.\n`);

        // ══════════════════════════════════════════════
        //  E.  UPCOMING APPOINTMENTS (pending / confirmed)
        // ══════════════════════════════════════════════
        console.log('📅 Creating upcoming appointments...');
        let totalUpcoming = 0;
        const upcomingSlots = shuffle(savedLawyers).slice(0, 20); // 20 lawyers get upcoming bookings

        for (const lawyer of upcomingSlots) {
            const n = Math.floor(1 + Math.random() * 3); // 1-3 upcoming each
            for (let k = 0; k < n; k++) {
                const client = pick(savedClients);
                const { date: upcomingDate, time: upcomingTime } = reserveAppointmentSlot(
                    lawyer._id,
                    () => daysFromNow(Math.floor(1 + Math.random() * 14)) // 1-14 days
                );
                const status = Math.random() > 0.4 ? 'confirmed' : 'pending';
                await new Appointment({
                    client: client._id,
                    lawyer: lawyer._id,
                    date: upcomingDate,
                    time: upcomingTime,
                    duration: 60,
                    consultationType: Math.random() > 0.2 ? 'video' : 'chat',
                    status,
                    amount: lawyer.hourlyRate,
                    paymentStatus: status === 'confirmed' ? 'paid' : 'pending',
                }).save();
                totalUpcoming++;
            }
        }
        console.log(`   ✅ ${totalUpcoming} upcoming appointments created.\n`);

        // ══════════════════════════════════════════════
        //  F.  CANCELLED / REJECTED APPOINTMENTS (for realism)
        // ══════════════════════════════════════════════
        console.log('🚫 Creating cancelled/rejected appointments...');
        let totalCancelled = 0;
        for (let c = 0; c < 8; c++) {
            const lawyer = pick(savedLawyers);
            const client = pick(savedClients);
            const ago = Math.floor(5 + Math.random() * 60);
            const { date: cancelledDate, time: cancelledTime } = reserveAppointmentSlot(
                lawyer._id,
                () => daysAgo(ago)
            );
            const isCancelled = Math.random() > 0.5;
            await new Appointment({
                client: client._id,
                lawyer: lawyer._id,
                date: cancelledDate,
                time: cancelledTime,
                duration: 60,
                consultationType: 'video',
                status: isCancelled ? 'cancelled' : 'rejected',
                amount: lawyer.hourlyRate,
                paymentStatus: 'refunded',
                ...(isCancelled
                    ? { cancellationReason: pick(['Schedule conflict', 'Personal emergency', 'Found another lawyer', 'Issue resolved']), cancelledAt: cancelledDate }
                    : { rejectionReason: pick(['Schedule fully booked', 'Case outside expertise', 'Conflict of interest']), rejectedAt: daysAgo(ago) }
                ),
            }).save();
            totalCancelled++;
        }
        console.log(`   ✅ ${totalCancelled} cancelled/rejected appointments.\n`);

        // ══════════════════════════════════════════════
        //  G.  CONVERSATIONS + CHAT MESSAGES
        // ══════════════════════════════════════════════
        console.log('💬 Creating conversations & messages...');
        let totalConvos = 0, totalMessages = 0;

        // Pick 15 random client-lawyer pairs from completed appointments
        const completedAppointments = await Appointment.find({ status: 'completed' }).limit(15);
        const chatPairs = new Set();

        for (const appt of completedAppointments) {
            const pairKey = `${appt.client}-${appt.lawyer}`;
            if (chatPairs.has(pairKey)) continue;
            chatPairs.add(pairKey);

            const convo = await new Conversation({
                members: [appt.client, appt.lawyer],
                participants: [appt.client, appt.lawyer],
                lastActivity: daysAgo(Math.floor(Math.random() * 30)),
            }).save();

            // 3-6 messages per conversation
            const msgCount = Math.floor(3 + Math.random() * 4);
            const greetings = [
                'Assalam o Alaikum, I need some guidance regarding my case.',
                'Hello, I wanted to follow up on our last consultation.',
                'Thank you for the consultation. I have a quick question.',
                'Salam, can we discuss the next steps?',
                'Hi, when can we schedule the next meeting?',
            ];
            const replies = [
                'Walaikum Assalam. Sure, how can I help you?',
                'Hello! Please share the details and I will review.',
                'Of course. Please go ahead with your question.',
                'Sure, let me check my schedule and get back to you.',
                'Please send me the relevant documents and I will advise.',
            ];

            for (let m = 0; m < msgCount; m++) {
                const isClient = m % 2 === 0;
                const msg = await new ChatMessage({
                    conversationId: convo._id.toString(),
                    from: isClient ? appt.client : appt.lawyer,
                    to: isClient ? appt.lawyer : appt.client,
                    message: isClient ? pick(greetings) : pick(replies),
                    type: 'text',
                    timestamp: daysAgo(Math.floor(Math.random() * 20)),
                    isRead: Math.random() > 0.3,
                    isDelivered: true,
                }).save();
                totalMessages++;
            }

            // Update lastMessage on conversation
            const lastMsg = await ChatMessage.findOne({ conversationId: convo._id.toString() }).sort({ timestamp: -1 });
            if (lastMsg) {
                convo.lastMessage = lastMsg._id;
                await convo.save();
            }
            totalConvos++;
        }
        console.log(`   ✅ ${totalConvos} conversations, ${totalMessages} messages.\n`);

        // ══════════════════════════════════════════════
        //  H.  SERVICES
        // ══════════════════════════════════════════════
        console.log('⚖️  Creating 12 services...');
        const createdServices = await Service.insertMany(services.map(s => ({ ...s, createdBy: admin._id })));
        console.log(`   ✅ ${createdServices.length} services.\n`);

        // ══════════════════════════════════════════════
        //  I.  FAQs
        // ══════════════════════════════════════════════
        console.log('❓ Creating 30 FAQs...');
        const createdFAQs = await FAQ.insertMany(faqs.map(f => ({
            question: f.q, answer: f.a, category: f.cat, order: f.o, createdBy: admin._id,
        })));
        console.log(`   ✅ ${createdFAQs.length} FAQs.\n`);

        // ══════════════════════════════════════════════
        //  J.  BLOGS  (40 blogs, published over last 120 days)
        // ══════════════════════════════════════════════
        console.log('📚 Creating 40 blogs...');
        const blogDocs = blogTopics.map((t, i) => {
            const content = generateBlogContent(t.title);
            const pubDate = daysAgo(Math.floor(1 + (i * 3))); // spread over ~120 days
            return {
                title: t.title,
                slug: t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                excerpt: content.substring(0, 200) + '...',
                content,
                category: t.category,
                tags: t.tags,
                author: admin._id,
                status: 'published',
                views: Math.floor(50 + Math.random() * 950),
                publishedAt: pubDate,
                isActive: true,
            };
        });
        const createdBlogs = await Blog.insertMany(blogDocs);
        console.log(`   ✅ ${createdBlogs.length} blogs.\n`);

        // ══════════════════════════════════════════════
        //  K.  CONTACT MESSAGES  (20)
        // ══════════════════════════════════════════════
        console.log('📩 Creating 20 contact messages...');
        const contactNames = shuffle([...clients.map(c => c.name), 'Anonymous User', 'Guest Visitor']).slice(0, 20);
        const contactDocs = contactNames.map((name, i) => {
            const subject = contactSubjects[i % contactSubjects.length];
            return {
                name,
                email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                phone: generatePhone(),
                subject,
                message: `Assalam o Alaikum,\n\nI am writing regarding "${subject.toLowerCase()}". I need professional legal guidance on this matter and would like to know how to proceed with a consultation.\n\nPlease advise on the next steps and any documents I should prepare.\n\nShukria`,
                status: Math.random() > 0.6 ? 'read' : 'unread',
                createdAt: randomDaysAgo(1, 30),
            };
        });
        const createdMessages = await ContactMessage.insertMany(contactDocs);
        console.log(`   ✅ ${createdMessages.length} contact messages.\n`);

        // ══════════════════════════════════════════════
        //  L.  NOTIFICATIONS  (recent 15 for admin)
        // ══════════════════════════════════════════════
        console.log('🔔 Creating 15 admin notifications...');
        const notifTypes = [
            { type: 'new_user',           title: 'New Client Registered',      msg: (n) => `${n} has joined LegalMate as a new client.` },
            { type: 'new_lawyer',         title: 'New Lawyer Registered',      msg: (n) => `${n} has registered as a lawyer and is pending verification.` },
            { type: 'new_appointment',    title: 'New Appointment Booked',     msg: (n) => `${n} has booked a new consultation appointment.` },
            { type: 'new_feedback',       title: 'New Feedback Submitted',     msg: (n) => `${n} has submitted feedback for a consultation.` },
            { type: 'contact_message',    title: 'New Contact Message',        msg: (n) => `${n} has sent a message through the contact form.` },
            { type: 'balance_request',    title: 'Balance Top-up Request',     msg: (n) => `${n} has requested a wallet top-up.` },
        ];
        const notifDocs = [];
        for (let n = 0; n < 15; n++) {
            const nt = pick(notifTypes);
            const person = pick([...savedClients, ...savedLawyers]);
            notifDocs.push({
                type: nt.type,
                title: nt.title,
                message: nt.msg(person.name),
                metadata: { userName: person.name, userEmail: person.email },
                read: n > 5, // first 6 are unread
                createdAt: randomDaysAgo(0, 20),
            });
        }
        await Notification.insertMany(notifDocs);
        console.log('   ✅ 15 notifications.\n');

        // ══════════════════════════════════════════════
        //  SUMMARY
        // ══════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════');
        console.log('📊 SEEDING COMPLETE — Summary:');
        console.log('═══════════════════════════════════════════════');
        console.log(`   👨‍⚖️  Lawyers:             ${savedLawyers.length}`);
        console.log(`   👤 Clients:             ${savedClients.length}`);
        console.log(`   💰 Wallet Balances:     ${savedLawyers.length + savedClients.length}`);
        console.log(`   📅 Past Appointments:   ${totalPast}`);
        console.log(`   📅 Upcoming Appts:      ${totalUpcoming}`);
        console.log(`   🚫 Cancelled/Rejected:  ${totalCancelled}`);
        console.log(`   💬 Conversations:       ${totalConvos}`);
        console.log(`   💬 Chat Messages:       ${totalMessages}`);
        console.log(`   ⚖️  Services:            ${createdServices.length}`);
        console.log(`   ❓ FAQs:                ${createdFAQs.length}`);
        console.log(`   📚 Blogs:               ${createdBlogs.length}`);
        console.log(`   📩 Contact Messages:    ${createdMessages.length}`);
        console.log(`   🔔 Notifications:       15`);
        console.log('═══════════════════════════════════════════════');
        console.log(`\n📧 Password for all users: Legal@12`);
        console.log(`   Example: ahmed.hassan.legal@gmail.com / Legal@12`);
        console.log(`   Example: waqas.ahmed72@gmail.com / Legal@12\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
