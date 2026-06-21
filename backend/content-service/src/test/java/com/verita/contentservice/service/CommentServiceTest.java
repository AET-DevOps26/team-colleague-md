package com.verita.contentservice.service;

import com.verita.contentservice.entity.CommentEntity;
import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.CommentRequest;
import com.verita.model.CommentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private PostRepository postRepository;
    @Mock private VoteRepository voteRepository;
    @Mock private UserClient userClient;
    @Mock private SecurityUtils securityUtils;
    @InjectMocks private CommentService commentService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userId = UUID.randomUUID();
        lenient().when(securityUtils.getCurrentUserId()).thenReturn(userId);
        lenient().when(securityUtils.getCurrentUserIdOptional()).thenReturn(Optional.of(userId));
        when(commentRepository.save(any(CommentEntity.class))).thenAnswer(inv -> {
            CommentEntity c = inv.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });
    }

    private PostEntity publishedPost() {
        PostEntity p = new PostEntity();
        p.setId(UUID.randomUUID());
        p.setAuthorId(UUID.randomUUID());
        p.setStatus(PostStatus.PUBLISHED);
        return p;
    }

    private CommentEntity comment(UUID id, UUID author, PostEntity post) {
        CommentEntity c = new CommentEntity();
        c.setId(id);
        c.setAuthorId(author);
        c.setPost(post);
        c.setText("a comment");
        return c;
    }

    // ---- addComment ---------------------------------------------------------

    @Test
    void addComment_topLevel_savesAndIncrementsCount() {
        PostEntity post = publishedPost();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));

        CommentResponse response = commentService.addComment(post.getId(), new CommentRequest("Nice post"));

        assertNotNull(response.getId());
        assertEquals("Nice post", response.getText());
        verify(commentRepository).save(any(CommentEntity.class));
        verify(postRepository).incrementCommentCount(post.getId());
    }

    @Test
    void addComment_replyToParentInSamePost_linksParent() {
        PostEntity post = publishedPost();
        CommentEntity parent = comment(UUID.randomUUID(), UUID.randomUUID(), post);
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(commentRepository.findByIdAndDeletedFalse(parent.getId())).thenReturn(Optional.of(parent));

        commentService.addComment(post.getId(), new CommentRequest("A reply").parentId(parent.getId()));

        ArgumentCaptor<CommentEntity> saved = ArgumentCaptor.forClass(CommentEntity.class);
        verify(commentRepository).save(saved.capture());
        assertEquals(parent, saved.getValue().getParentComment());
    }

    @Test
    void addComment_parentInDifferentPost_throwsBadRequest() {
        PostEntity post = publishedPost();
        PostEntity otherPost = publishedPost();
        CommentEntity parent = comment(UUID.randomUUID(), UUID.randomUUID(), otherPost);
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(commentRepository.findByIdAndDeletedFalse(parent.getId())).thenReturn(Optional.of(parent));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.addComment(post.getId(),
                        new CommentRequest("A reply").parentId(parent.getId())));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void addComment_draftByNonAuthor_throwsNotFound() {
        PostEntity draft = publishedPost();
        draft.setStatus(PostStatus.DRAFT);
        when(postRepository.findByIdAndDeletedFalse(draft.getId())).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.addComment(draft.getId(), new CommentRequest("hi")));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- deleteComment ------------------------------------------------------

    @Test
    void deleteComment_author_softDeletesAndDecrements() {
        PostEntity post = publishedPost();
        CommentEntity own = comment(UUID.randomUUID(), userId, post);
        when(commentRepository.findByIdAndDeletedFalse(own.getId())).thenReturn(Optional.of(own));

        commentService.deleteComment(own.getId());

        assertTrue(own.isDeleted());
        assertEquals("[deleted]", own.getText());
        assertNotNull(own.getDeletedAt());
        verify(postRepository).decrementCommentCount(post.getId());
    }

    @Test
    void deleteComment_nonAuthor_throwsForbidden() {
        PostEntity post = publishedPost();
        CommentEntity other = comment(UUID.randomUUID(), UUID.randomUUID(), post);
        when(commentRepository.findByIdAndDeletedFalse(other.getId())).thenReturn(Optional.of(other));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.deleteComment(other.getId()));

        assertEquals(403, ex.getStatusCode().value());
        verify(postRepository, never()).decrementCommentCount(any());
    }

    @Test
    void deleteComment_missing_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(commentRepository.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.deleteComment(id));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- getComments tree ---------------------------------------------------

    @Test
    void getComments_buildsNestedReplyTree() {
        PostEntity post = publishedPost();
        CommentEntity root = comment(UUID.randomUUID(), UUID.randomUUID(), post);
        CommentEntity reply = comment(UUID.randomUUID(), UUID.randomUUID(), post);
        reply.setParentComment(root);
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(commentRepository.findByPost_IdOrderByCreatedAtAsc(post.getId()))
                .thenReturn(List.of(root, reply));

        List<CommentResponse> tree = commentService.getComments(post.getId());

        assertEquals(1, tree.size());
        assertEquals(root.getId(), tree.get(0).getId());
        assertEquals(1, tree.get(0).getReplies().size());
        assertEquals(reply.getId(), tree.get(0).getReplies().get(0).getId());
    }

    @Test
    void getComments_draftByNonAuthor_throwsNotFound() {
        PostEntity draft = publishedPost();
        draft.setStatus(PostStatus.DRAFT);
        when(postRepository.findByIdAndDeletedFalse(draft.getId())).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.getComments(draft.getId()));

        assertEquals(404, ex.getStatusCode().value());
    }
}
