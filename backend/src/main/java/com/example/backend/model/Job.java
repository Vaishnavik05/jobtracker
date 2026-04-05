package com.example.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String company;
    private String role;
    private String status;
    private LocalDate appliedDate;
    private String location;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String notes;

    @ManyToOne
    private User user;
}