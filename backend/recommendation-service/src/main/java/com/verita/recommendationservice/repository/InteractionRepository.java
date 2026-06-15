package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.Interaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InteractionRepository extends JpaRepository<Interaction, UUID> {

    List<Interaction> findByUserId(UUID userId);
}
