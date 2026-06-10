package com.verita.contentservice.controller;

import com.verita.api.ApiApi;
import com.verita.contentservice.service.CommentService;
import com.verita.contentservice.service.InteractionService;
import com.verita.contentservice.service.PostService;
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
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@RestController
@Validated
public class ContentController implements ApiApi {
    private final PostService postService;
    private final CommentService commentService;
    private final InteractionService interactionService;

    public ContentController(PostService postService, CommentService commentService,
                             InteractionService interactionService) {
        this.postService = postService;
        this.commentService = commentService;
        this.interactionService = interactionService;
    }

    @Override
    public ResponseEntity<PostResponse> createPost(@Valid PostRequest postRequest) {
        return ResponseEntity.status(201).body(postService.createPost(postRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<PostResponse> updatePost(UUID id, @Valid PostRequest postRequest) {
        return ResponseEntity.ok(postService.updatePost(id, postRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<Void> deletePost(UUID id) {
        postService.deletePost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PostPage> getAllPosts(Integer page, Integer size, String tag) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getAllPosts(p, s, tag, currentAuth()));
    }

    @Override
    public ResponseEntity<PostResponse> getPostById(UUID id) {
        return ResponseEntity.ok(postService.getPost(id, currentAuth()));
    }

    @Override
    public ResponseEntity<List<PostCard>> getPostCards(List<UUID> ids) {
        return ResponseEntity.ok(postService.getCards(ids, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> searchPosts(@NotBlank String q, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.searchPosts(q, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostLikeResponse> likePost(UUID id, @Valid LikeRequest likeRequest) {
        return ResponseEntity.ok(interactionService.likePost(id, likeRequest.getType(), currentAuth()));
    }

    @Override
    public ResponseEntity<Void> bookmarkPost(UUID id) {
        interactionService.bookmarkPost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unbookmarkPost(UUID id) {
        interactionService.unbookmarkPost(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<CommentResponse>> getCommentsByPost(UUID id) {
        return ResponseEntity.ok(commentService.getComments(id, currentAuth()));
    }

    @Override
    public ResponseEntity<CommentResponse> createComment(UUID id, @Valid CommentRequest commentRequest) {
        return ResponseEntity.status(201).body(commentService.addComment(id, commentRequest, currentAuth()));
    }

    @Override
    public ResponseEntity<Void> deleteComment(UUID id) {
        commentService.deleteComment(id, currentAuth());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<CommentLikeResponse> likeComment(UUID id) {
        return ResponseEntity.ok(interactionService.likeComment(id, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getMyDrafts(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getMyDrafts(p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserPosts(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserPosts(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserBookmarks(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserBookmarks(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<PostPage> getUserLikes(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserLikes(id, p, s, currentAuth()));
    }

    @Override
    public ResponseEntity<List<TagResponse>> getTrendingTags() {
        return ResponseEntity.ok(postService.trendingTags());
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
