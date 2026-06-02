package com.verita.contentservice.repository;
import com.verita.contentservice.VoteEntity;
import com.verita.contentservice.VoteTargetType;
import com.verita.contentservice.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface VoteRepository extends JpaRepository<VoteEntity, UUID> {
    Optional<VoteEntity> findByUserIdAndTargetTypeAndTargetId(UUID userId, VoteTargetType targetType, UUID targetId);
    long countByTargetTypeAndTargetIdAndVoteType(VoteTargetType targetType, UUID targetId, VoteType voteType);
    List<VoteEntity> findByUserIdAndTargetTypeAndVoteType(UUID userId, VoteTargetType targetType, VoteType voteType);
}
