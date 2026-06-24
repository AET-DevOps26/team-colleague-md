package com.verita.contentservice.controller;

import com.verita.api.CommentsApi;
import com.verita.contentservice.service.CommentService;
import com.verita.model.CommentRequest;
import com.verita.model.CommentResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class CommentController implements CommentsApi {
    private final CommentService commentService;

    @Override
    public ResponseEntity<List<CommentResponse>> getCommentsByPost(UUID id) {
        return ResponseEntity.ok(commentService.getComments(id));
    }

    @Override
    public ResponseEntity<CommentResponse> createComment(UUID id, @Valid CommentRequest commentRequest) {
        return ResponseEntity.status(201).body(commentService.addComment(id, commentRequest));
    }

    @Override
    public ResponseEntity<Void> deleteComment(UUID id) {
        commentService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }
}
