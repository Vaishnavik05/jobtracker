package com.example.backend.repository;

import com.example.backend.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByUserId(Long userId);
    
    List<Job> findByUserIdAndStatus(Long userId, String status);
    
    List<Job> findByUserIdAndCompanyIgnoreCase(Long userId, String company);
    
    List<Job> findByUserIdAndStatusAndCompanyIgnoreCase(Long userId, String status, String company);
    
    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, String status);
}
