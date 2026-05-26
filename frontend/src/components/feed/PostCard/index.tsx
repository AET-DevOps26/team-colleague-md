import type { Post } from '../../../types';
import ImageCard from '../ImageCard';
import TextCard from '../TextCard';

interface Props {
  post: Post;
  onLike: (id: string) => void;
}

export default function PostCard({ post, onLike }: Props) {
  if (post.coverImageUrl) {
    return <ImageCard post={post} onLike={onLike} />;
  }
  return <TextCard post={post} onLike={onLike} />;
}
