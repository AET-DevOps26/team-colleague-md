package com.verita.contentservice.controller;

import com.verita.api.PostsApi;
import com.verita.contentservice.service.PostService;
import com.verita.model.PostCard;
import com.verita.model.PostPage;
import com.verita.model.PostPatchRequest;
import com.verita.model.PostRequest;
import com.verita.model.PostResponse;
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
public class PostController implements PostsApi {
    private final PostService postService;

    @Override
    public ResponseEntity<PostResponse> createPost(@Valid PostRequest postRequest) {
        return ResponseEntity.status(201).body(postService.createPost(postRequest));
    }

    @Override
    public ResponseEntity<PostResponse> updatePost(UUID id, @Valid PostRequest postRequest) {
        return ResponseEntity.ok(postService.updatePost(id, postRequest));
    }

    @Override
    public ResponseEntity<PostResponse> patchPost(UUID id, @Valid PostPatchRequest postPatchRequest) {
        return ResponseEntity.ok(postService.patchPost(id, postPatchRequest));
    }

    @Override
    public ResponseEntity<Void> deletePost(UUID id) {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PostPage> getAllPosts(Integer page, Integer size, String topic, String type) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getAllPosts(p, s, topic, type));
    }

    @Override
    public ResponseEntity<PostResponse> getPostById(UUID id) {
        return ResponseEntity.ok(postService.getPost(id));
    }

    @Override
    public ResponseEntity<List<PostCard>> getPostCards(List<UUID> ids) {
        return ResponseEntity.ok(postService.getCards(ids));
    }

    @Override
    public ResponseEntity<PostPage> searchPosts(String q, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.searchPosts(q, p, s));
    }
}
