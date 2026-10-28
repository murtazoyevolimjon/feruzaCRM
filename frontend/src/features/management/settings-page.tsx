import { useState } from 'react';
import CoursesPage from './courses-page';
import RoomsPage from './rooms-page';

const TABS = [
  { key: 'courses', label: 'Kurslar', render: () => <CoursesPage /> },
  { key: 'rooms', label: 'Xonalar', render: () => <RoomsPage /> },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('courses');
  return (
    <div className="space-y-5">
      <h1>Sozlamalar</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`pill ${tab === t.key ? 'pill-active' : 'pill-idle'}`}>{t.label}</button>
        ))}
      </div>
      {TABS.find((t) => t.key === tab)?.render()}
    </div>
  );
}
