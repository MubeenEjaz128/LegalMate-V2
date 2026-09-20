/**
 * Test data fixtures for LegalMate E2E automation
 */

export const testUsers = {
  admin: {
    name: 'System Administrator',
    email: 'legalmate.services@gmail.com',
    password: 'Legal@12',
    role: 'admin',
  },
  client: {
    name: 'Test Client User',
    email: `client.${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '+92-300-1234567',
    address: '123 Blue Area, Islamabad, Pakistan',
    role: 'client',
  },
  lawyer: {
    name: 'Barrister Test Lawyer',
    email: `lawyer.${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '+92-301-9876543',
    address: '456 Mall Road, Lahore, Pakistan',
    role: 'lawyer',
    specialization: 'Corporate & Commercial Law',
    barNumber: 'LHR-BAR-2024-9988',
    hourlyRate: '5000',
    bio: 'Senior corporate legal counsel with 12+ years experience in contract law and dispute resolution.',
    languages: ['English', 'Urdu'],
  },
};

export const viewports = [
  { name: '4K/FullHD Desktop', width: 1920, height: 1080 },
  { name: 'Standard Laptop', width: 1366, height: 768 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Modern Mobile (iPhone/Pixel)', width: 390, height: 844 },
  { name: 'Compact Mobile (Galaxy/Android)', width: 360, height: 800 },
];
