import java.util.List;
import java.util.UUID;

public class FeedPage {
    private List<UUID> postIds;
    private String nextCursor;

    public FeedPage(List<UUID> postIds, String nextCursor) {
        this.postIds = postIds;
        this.nextCursor = nextCursor;
    }
    // Getters and Setters
}