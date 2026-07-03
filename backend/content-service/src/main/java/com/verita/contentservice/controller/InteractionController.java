package com.verita.contentservice.controller;

import com.verita.api.InteractionsApi;
import com.verita.contentservice.service.InteractionService;
import com.verita.model.CommentLikeRequest;
import com.verita.model.CommentLikeResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostLikeResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class InteractionController implements InteractionsApi {
    private final InteractionService interactionService;

    @Override
    public ResponseEntity<PostLikeResponse> likePost(UUID id, @Valid LikeRequest likeRequest) {
        return ResponseEntity.ok(interactionService.likePost(id, likeRequest.getType()));
    }

    @Override
    public ResponseEntity<Void> bookmarkPost(UUID id) {
        interactionService.bookmarkPost(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unbookmarkPost(UUID id) {
        interactionService.unbookmarkPost(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<CommentLikeResponse> likeComment(UUID id, @Valid CommentLikeRequest commentLikeRequest) {
        return ResponseEntity.ok(interactionService.likeComment(id, commentLikeRequest.getType()));
    }
}
