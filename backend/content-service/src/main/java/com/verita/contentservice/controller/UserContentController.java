package com.verita.contentservice.controller;

import com.verita.api.UsersApi;
import com.verita.contentservice.service.PostService;
import com.verita.model.PostPage;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

/** A given user's public content lists (their posts, bookmarks, likes). */
@RestController
@Validated
@RequiredArgsConstructor
public class UserContentController implements UsersApi {
    private final PostService postService;

    @Override
    public ResponseEntity<PostPage> getUserPosts(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserPosts(id, p, s));
    }

    @Override
    public ResponseEntity<PostPage> getUserBookmarks(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserBookmarks(id, p, s));
    }

    @Override
    public ResponseEntity<PostPage> getUserLikes(UUID id, Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getUserLikes(id, p, s));
    }
}
