package com.verita.contentservice.controller;

import com.verita.api.ApiApi;
import com.verita.contentservice.service.ContentService;
import com.verita.model.CommentLikeResponse;
import com.verita.model.CommentRequest;
import com.verita.model.CommentResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostCard;
import com.verita.model.PostLikeResponse;
import com.verita.model.PostPage;
import com.verita.model.PostRequest;
import com.verita.model.PostResponse;
import com.verita.model.TagResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
public class ContentController implements ApiApi {
    private final ContentService service;

    public ContentController(ContentService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<PostResponse> createPost(@Valid PostRequest postRequest) {
        return ResponseEntity.status(201).body(service.createPost(postRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<PostResponse> updatePost(UUID id, @Valid PostRequest postRequest) {
        return ResponseEntity.ok(service.updatePost(id, postRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<Void> deletePost(UUID id) {
        service.deletePost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PostPage> getAllPosts(Integer page, Integer size, String tag) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.getAllPosts(p, s, tag, currentAuth()));
    }

    @Override
    public ResponseEntity<PostResponse> getPostById(UUID id) {
        return ResponseEntity.ok(service.getPost(id, currentAuth()));
    }

    @Override
    public ResponseEntity<List<PostCard>> getPostCards(List<UUID> ids) {
        return ResponseEntity.ok(service.getCards(ids, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> searchPosts(@NotBlank String q, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.searchPosts(q, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostLikeResponse> likePost(UUID id, @Valid LikeRequest likeRequest) {
        return ResponseEntity.ok(service.likePost(id, likeRequest.getType(), currentAuth()));
    }

    @Override
    public ResponseEntity<Void> bookmarkPost(UUID id) {
        service.bookmarkPost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unbookmarkPost(UUID id) {
        service.unbookmarkPost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<CommentResponse>> getCommentsByPost(UUID id) {
        return ResponseEntity.ok(service.getComments(id, currentAuth()));
    }

    @Override
    public ResponseEntity<CommentResponse> createComment(UUID id, @Valid CommentRequest commentRequest) {
        return ResponseEntity.status(201).body(service.addComment(id, commentRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<Void> deleteComment(UUID id) {
        service.deleteComment(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<CommentLikeResponse> likeComment(UUID id) {
        return ResponseEntity.ok(service.likeComment(id, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getMyDrafts(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.getMyDrafts(p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserPosts(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.getUserPosts(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserBookmarks(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.getUserBookmarks(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserLikes(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(service.getUserLikes(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<List<TagResponse>> getTrendingTags() {
        return ResponseEntity.ok(service.trendingTags());
    }

    private String currentAuth() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            HttpServletRequest request = servletRequestAttributes.getRequest();
            return request.getHeader("Authorization");
        }
        return null;
    }
}
