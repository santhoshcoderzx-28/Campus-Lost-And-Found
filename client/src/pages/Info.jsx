import { Link } from 'react-router-dom';

const CONTENT = {
  about: {
    title: 'About this platform',
    body: [
      'Campus Lost & Found is a single, searchable record of belongings lost and found on campus. It replaces announcements scattered across chat groups with a structured report that anyone can search.',
      'Students report a lost item or publish a found item. When someone believes a found item is theirs, they submit a recovery request that the finder reviews before any handover. Administrators moderate listings, review requests and manage accounts.',
      'This application was built as an individual academic project for Web Technology and Internet Programming at Sai University.',
    ],
  },
  privacy: {
    title: 'Privacy',
    body: [
      'We store the minimum needed to run the service: your name, university email, an optional student ID, a bcrypt hash of your password, and the reports and recovery requests you create.',
      'Your email address is never shown on a public listing. Only the person who reported an item sees the name, email and student ID of someone requesting it, because they have to verify the claim.',
      'Passwords are stored only as bcrypt hashes and can never be read back. You can change your password from your profile at any time.',
    ],
  },
  terms: {
    title: 'Terms of use',
    body: [
      'Report only items that were genuinely lost or found on campus. False reports, or recovery requests for items that are not yours, may lead to your account being suspended.',
      'Do not post identity documents, bank details or anything that would let another person impersonate you. Physical handover of an item happens in person; the platform only connects the two sides.',
      'Administrators may edit the status of a report or remove a listing that breaks these rules.',
    ],
  },
  contact: {
    title: 'Contact',
    body: [
      'For help with a report, contact the campus lost and found desk at the main gate security office.',
      'For problems with the platform itself, contact the School of Computing and Data Science.',
      'Sai University, School of Computing and Data Science, B.Tech Computer Science, 2026-2027.',
    ],
  },
};

export default function Info({ type }) {
  const page = CONTENT[type] || CONTENT.about;
  return (
    <div className="container section">
      <span className="eyebrow">Information</span>
      <h1 className="h2">{page.title}</h1>
      <div className="card card-pad" style={{ maxWidth: 760 }}>
        {page.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="mb-2">{paragraph}</p>
        ))}
        <div className="divider" />
        <Link to="/browse" className="btn btn-sm btn-ghost">Browse items</Link>
      </div>
    </div>
  );
}
