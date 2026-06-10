import { getInitials } from '../../../utils/getInitials';
import styles from './Avatar.module.css';

interface Props {
  displayName: string;
  avatarUrl?: string | null;
  size?: number;
  borderRadius?: number;
  className?: string;
}

export default function Avatar({ displayName, avatarUrl, size = 36, borderRadius = 10, className }: Props) {
  const initials = getInitials(displayName);

  return (
    <div
      className={`${styles.avatar} ${className ?? ''}`}
      style={{ width: size, height: size, borderRadius }}
      aria-label={displayName}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} />
      ) : (
        <span className={styles.initials} style={{ fontSize: Math.round(size * 0.33) }}>
          {initials}
        </span>
      )}
    </div>
  );
}
