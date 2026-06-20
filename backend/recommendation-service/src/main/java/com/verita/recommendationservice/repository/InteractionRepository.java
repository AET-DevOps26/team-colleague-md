package com.verita.recommendationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.verita.recommendationservice.entity.Interaction;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface InteractionRepository extends JpaRepository<Interaction, UUID> {

    List<Interaction> findByUserId(UUID userId);

    /** Distinct posts a user has interacted with — used to seen-filter the personal feed (#159). */
    @Query("SELECT DISTINCT i.postId FROM Interaction i WHERE i.userId = :userId")
    Set<UUID> findDistinctPostIdsByUserId(UUID userId);
}
