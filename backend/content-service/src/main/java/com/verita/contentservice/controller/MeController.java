package com.verita.contentservice.controller;

import com.verita.api.MeApi;
import com.verita.contentservice.service.PostService;
import com.verita.model.PostPage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class MeController implements MeApi {
    private final PostService postService;

    @Override
    public ResponseEntity<PostPage> getMyDrafts(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(postService.getMyDrafts(p, s));
    }
}
