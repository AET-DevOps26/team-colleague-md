import type { Post } from '../../../types';
import ImageCard from '../ImageCard';
import TextCard from '../TextCard';

interface Props {
  post: Post;
  onLike: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export default function PostCard({ post, onLike, onTagClick }: Props) {
  if (post.coverImageUrl) {
    return <ImageCard post={post} onLike={onLike} onTagClick={onTagClick} />;
  }
  return <TextCard post={post} onLike={onLike} onTagClick={onTagClick} />;
}
