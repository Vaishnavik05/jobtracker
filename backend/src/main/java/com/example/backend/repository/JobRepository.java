package com.example.backend.repository;

import com.example.backend.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    // Public jobs created by admin (not assigned to a specific user yet)
    List<Job> findByUserIsNull();

    // Prevent duplicate apply by same user for same company+role public post
    boolean existsByUserIdAndCompanyIgnoreCaseAndRoleIgnoreCase(Long userId, String company, String role);

    @Query("select count(distinct j.user.id) from Job j where j.user is not null")
    long countDistinctUsersWithApplications();

    @Query("select count(distinct lower(j.company)) from Job j where j.company is not null and trim(j.company) <> ''")
    long countDistinctCompanies();

    @Query("select count(distinct j.user.id) from Job j where j.user is not null and (j.status = 'HR Interview' or j.status = 'Offer')")
    long countDistinctUsersWithOffers();

    @Query("select j.status, count(j) from Job j group by j.status")
    List<Object[]> countByStatusGrouped();

    List<Job> findByUserIsNotNull();
}
