import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/v1/feed")
public class FeedController {

    @RequestMapping(value = "/personal", method = RequestMethod.GET)
    public ResponseEntity<FeedPage> getPersonalFeed(
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "size", defaultValue = "20") int size) {

        // TODO: Call Recommendation Engine Service
        FeedPage page = new FeedPage(new ArrayList<UUID>(), null);
        return ResponseEntity.ok(page);
    }

    @RequestMapping(value = "/trending", method = RequestMethod.GET)
    public ResponseEntity<FeedPage> getTrendingFeed(
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "size", defaultValue = "20") int size) {

        // TODO: Call Trending Algorithm Service
        FeedPage page = new FeedPage(new ArrayList<UUID>(), null);
        return ResponseEntity.ok(page);
    }
}