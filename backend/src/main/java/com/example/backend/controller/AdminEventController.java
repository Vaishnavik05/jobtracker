package com.example.backend.controller;

import com.example.backend.model.CompanyEvent;
import com.example.backend.repository.CompanyEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminEventController {

    private final CompanyEventRepository repo;

    @GetMapping
    public ResponseEntity<List<CompanyEvent>> all() {
        return ResponseEntity.ok(repo.findAll());
    }

    @PostMapping
    public ResponseEntity<CompanyEvent> create(@RequestBody(required = false) CompanyEvent event) {
        if (event == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event payload is required");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyEvent> update(
            @PathVariable(required = false) Long id,
            @RequestBody(required = false) CompanyEvent event
    ) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event id is required");
        }
        if (event == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event payload is required");
        }

        CompanyEvent existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        existing.setCompanyName(event.getCompanyName());
        existing.setEventTitle(event.getEventTitle());
        existing.setDescription(event.getDescription());
        existing.setApplyUrl(event.getApplyUrl());
        existing.setEventDate(event.getEventDate());

        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable(required = false) Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event id is required");
        }
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }

        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
