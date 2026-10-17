package ma.ensam.fame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FameApplication {
    public static void main(String[] args) {
        SpringApplication.run(FameApplication.class, args);
    }
}
