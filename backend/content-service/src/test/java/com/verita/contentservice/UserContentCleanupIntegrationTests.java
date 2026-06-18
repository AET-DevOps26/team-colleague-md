package com.verita.contentservice;

import com.verita.contentservice.domain.BookmarkEntity;
import com.verita.contentservice.domain.CommentEntity;
import com.verita.contentservice.domain.PostEntity;
import com.verita.contentservice.domain.PostStatus;
import com.verita.contentservice.domain.TopicEntity;
import com.verita.contentservice.domain.VoteEntity;
import com.verita.contentservice.domain.VoteTargetType;
import com.verita.contentservice.domain.VoteType;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.VoteRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class UserContentCleanupIntegrationTests {
    private MockMvc mockMvc;

    @Autowired private WebApplicationContext context;
    @Autowired private PostRepository postRepository;
    @Autowired private CommentRepository commentRepository;
    @Autowired private BookmarkRepository bookmarkRepository;
    @Autowired private VoteRepository voteRepository;
    @Autowired private TopicRepository topicRepository;
    @Autowired private DataSource dataSource;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load()
                .clean();
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    @Test
    void deleteUserContentDataCleansOwnedRowsAndRefreshesCounters() throws Exception {
        UUID deletedUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        TopicEntity topic = new TopicEntity();
        topic.setName("cleanup-" + UUID.randomUUID().toString().substring(0, 8));
        topic.setDisplayName("Cleanup topic");
        topic.setTotalPostCount(1);
        topic = topicRepository.save(topic);

        PostEntity authoredPost = new PostEntity();
        authoredPost.setAuthorId(deletedUserId);
        authoredPost.setTitle("Authored post");
        authoredPost.setContent("Authored content");
        authoredPost.setStatus(PostStatus.PUBLISHED);
        authoredPost.setTopics(new LinkedHashSet<>(List.of(topic)));
        authoredPost = postRepository.save(authoredPost);

        PostEntity otherPost = new PostEntity();
        otherPost.setAuthorId(otherUserId);
        otherPost.setTitle("Other post");
        otherPost.setContent("Other content");
        otherPost.setStatus(PostStatus.PUBLISHED);
        otherPost.setCommentCount(2);
        otherPost.setSaveCount(1);
        otherPost.setLikeCount(1);
        otherPost = postRepository.save(otherPost);

        CommentEntity deletedUserComment = new CommentEntity();
        deletedUserComment.setPost(otherPost);
        deletedUserComment.setAuthorId(deletedUserId);
        deletedUserComment.setText("Comment from deleted user");
        deletedUserComment = commentRepository.save(deletedUserComment);

        CommentEntity otherComment = new CommentEntity();
        otherComment.setPost(otherPost);
        otherComment.setAuthorId(otherUserId);
        otherComment.setText("Other comment");
        otherComment.setLikeCount(1);
        otherComment = commentRepository.save(otherComment);

        BookmarkEntity bookmark = new BookmarkEntity();
        bookmark.setUserId(deletedUserId);
        bookmark.setPost(otherPost);
        bookmarkRepository.save(bookmark);

        VoteEntity postVote = new VoteEntity();
        postVote.setUserId(deletedUserId);
        postVote.setTargetType(VoteTargetType.POST);
        postVote.setTargetId(otherPost.getId());
        postVote.setVoteType(VoteType.UPVOTE);
        voteRepository.save(postVote);

        VoteEntity commentVote = new VoteEntity();
        commentVote.setUserId(deletedUserId);
        commentVote.setTargetType(VoteTargetType.COMMENT);
        commentVote.setTargetId(otherComment.getId());
        commentVote.setVoteType(VoteType.UPVOTE);
        voteRepository.save(commentVote);

        mockMvc.perform(delete("/internal/v1/users/{userId}/data", deletedUserId)
                        .with(user("internal-service")))
                .andExpect(status().isNoContent());

        PostEntity cleanedAuthoredPost = postRepository.findById(authoredPost.getId()).orElseThrow();
        assertTrue(cleanedAuthoredPost.isDeleted());
        assertNotNull(cleanedAuthoredPost.getDeletedAt());
        assertEquals(0, topicRepository.findById(topic.getId()).orElseThrow().getTotalPostCount());

        CommentEntity cleanedComment = commentRepository.findById(deletedUserComment.getId()).orElseThrow();
        assertTrue(cleanedComment.isDeleted());
        assertNotNull(cleanedComment.getDeletedAt());
        assertEquals("[deleted]", cleanedComment.getText());

        PostEntity cleanedOtherPost = postRepository.findById(otherPost.getId()).orElseThrow();
        assertEquals(1, cleanedOtherPost.getCommentCount());
        assertEquals(0, cleanedOtherPost.getSaveCount());
        assertEquals(0, cleanedOtherPost.getLikeCount());
        assertEquals(0, commentRepository.findById(otherComment.getId()).orElseThrow().getLikeCount());
        assertTrue(bookmarkRepository.findByUserId(deletedUserId).isEmpty());
        assertTrue(voteRepository.findByUserId(deletedUserId).isEmpty());

        mockMvc.perform(delete("/internal/v1/users/{userId}/data", deletedUserId)
                        .with(user("internal-service")))
                .andExpect(status().isNoContent());
    }
}
