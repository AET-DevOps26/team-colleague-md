package com.verita.contentservice.controller;
import com.verita.contentservice.dto.*;
import com.verita.contentservice.service.ContentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping("/api/v1")
public class ContentController {
    private final ContentService service;
    public ContentController(ContentService service) { this.service = service; }
    @GetMapping("/posts")
    public PostPage getAllPosts(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestParam(required = false) String tag, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getAllPosts(page, size, tag, authorization); }
    @PostMapping("/posts")
    public ResponseEntity<PostResponse> createPost(@Valid @RequestBody PostRequest request, @RequestHeader("Authorization") String authorization) { return ResponseEntity.status(201).body(service.createPost(request, authorization)); }
    @GetMapping("/posts/cards")
    public List<PostCard> getPostCards(@RequestParam List<UUID> ids, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getCards(ids, authorization); }
    @GetMapping("/posts/search")
    public PostPage searchPosts(@RequestParam String q, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.searchPosts(q, page, size, authorization); }
    @GetMapping("/posts/{id}")
    public PostResponse getPost(@PathVariable UUID id, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getPost(id, authorization); }
    @PutMapping("/posts/{id}")
    public PostResponse updatePost(@PathVariable UUID id, @Valid @RequestBody PostRequest request, @RequestHeader("Authorization") String authorization) { return service.updatePost(id, request, authorization); }
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id, @RequestHeader("Authorization") String authorization) { service.deletePost(id, authorization); return ResponseEntity.noContent().build(); }
    @PostMapping("/posts/{id}/like")
    public PostLikeResponse likePost(@PathVariable UUID id, @Valid @RequestBody LikeRequest request, @RequestHeader("Authorization") String authorization) { return service.likePost(id, request.type(), authorization); }
    @PostMapping("/posts/{id}/bookmark")
    public ResponseEntity<Void> bookmarkPost(@PathVariable UUID id, @RequestHeader("Authorization") String authorization) { service.bookmarkPost(id, authorization, false); return ResponseEntity.noContent().build(); }
    @DeleteMapping("/posts/{id}/bookmark")
    public ResponseEntity<Void> unbookmarkPost(@PathVariable UUID id, @RequestHeader("Authorization") String authorization) { service.bookmarkPost(id, authorization, true); return ResponseEntity.noContent().build(); }
    @GetMapping("/posts/{id}/comments")
    public List<CommentResponse> getComments(@PathVariable UUID id, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getComments(id, authorization); }
    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<CommentResponse> createComment(@PathVariable UUID id, @Valid @RequestBody CommentRequest request, @RequestHeader("Authorization") String authorization) { return ResponseEntity.status(201).body(service.addComment(id, request, authorization)); }
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id, @RequestHeader("Authorization") String authorization) { service.deleteComment(id, authorization); return ResponseEntity.noContent().build(); }
    @PostMapping("/comments/{id}/like")
    public CommentLikeResponse likeComment(@PathVariable UUID id, @RequestHeader("Authorization") String authorization) { return service.likeComment(id, authorization); }
    @GetMapping("/me/drafts")
    public PostPage getDrafts(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestHeader("Authorization") String authorization) { return service.getMyDrafts(page, size, authorization); }
    @GetMapping("/users/{id}/posts")
    public PostPage getUserPosts(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getUserPosts(id, page, size, authorization); }
    @GetMapping("/users/{id}/bookmarks")
    public PostPage getUserBookmarks(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getUserBookmarks(id, page, size, authorization); }
    @GetMapping("/users/{id}/likes")
    public PostPage getUserLikes(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestHeader(value = "Authorization", required = false) String authorization) { return service.getUserLikes(id, page, size, authorization); }
    @GetMapping("/tags/trending")
    public List<TagResponse> trendingTags() { return service.trendingTags(); }
}
