package com.verita.contentservice.repository;
import com.verita.contentservice.domain.VoteEntity;
import com.verita.contentservice.domain.VoteTargetType;
import com.verita.contentservice.domain.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface VoteRepository extends JpaRepository<VoteEntity, UUID> {
    Optional<VoteEntity> findByUserIdAndTargetTypeAndTargetId(UUID userId, VoteTargetType targetType, UUID targetId);
    List<VoteEntity> findByUserIdAndTargetTypeAndTargetIdIn(UUID userId, VoteTargetType targetType, Collection<UUID> targetIds);
    long countByTargetTypeAndTargetIdAndVoteType(VoteTargetType targetType, UUID targetId, VoteType voteType);
    List<VoteEntity> findByUserIdAndTargetTypeAndVoteType(UUID userId, VoteTargetType targetType, VoteType voteType);
}
