package ma.ensam.fame.web.admin;

import ma.ensam.fame.service.AdminOverviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/overview")
public class AdminOverviewController {

    private final AdminOverviewService overviewService;

    public AdminOverviewController(AdminOverviewService overviewService) {
        this.overviewService = overviewService;
    }

    @GetMapping
    public Map<String, Object> overview() {
        return overviewService.overview();
    }
}
