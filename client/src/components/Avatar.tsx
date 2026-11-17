import { User } from '../types';
import { initials } from '../utils';

export default function Avatar({ user, size = 44 }: { user: User | null | undefined; size?: number }) {
  const color = user?.avatarColor || '#3B82F6';
  const { letters } = initials(user?.displayName || user?.username || '?', color);
  const online = user?.status === 'online';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold select-none"
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
      >
        {letters}
      </div>
      {user && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 ${
            online ? 'bg-green-500' : 'bg-slate-400'
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
