# E-tivity 5 — Transcript Request and Tracking

**Group:** A\
**Course:** SWE2106 Internet Technologies and Web Design\
**Institution:** Mbarara University of Science and Technology\
**Date:** 10 November 2026

## Problem

Students need a clear way to request an academic transcript and find out whether it is ready. When requests and updates are handled across separate channels, students may have to make repeated enquiries and registrar staff may struggle to find the latest status. The project addresses this workflow risk by giving both groups a shared request record.

## Users

- **Students** submit transcript requests and view the status of their own requests.
- **Registrar staff** review pending requests, update their status, and record a reason when rejecting a request.

## Objectives

1. Provide a single place to submit and track transcript requests.
2. Give registrar staff a queue showing which requests still need action.
3. Preserve each request and its status changes in a database.
4. Validate requests on the server and verify the API using successful and invalid requests in Postman.

## Proposed solution and scope

A student submits a request through a browser form. An Express API validates the input, stores the request, and returns a reference number. Registrar staff review the request and update its status. The student sees the updated status on their dashboard. The demonstration uses fictional student records and separate student and staff accounts. The API enforces who can view or change each request.

The initial release covers submission, request tracking, staff review, and status history. Transcript generation, fees, payments, and integration with the university's student information system are outside the initial scope.

## Expected benefits

- Students can check status without making repeated enquiries.
- Staff can identify pending requests and see the most recent action.
- A stored history supports follow-up when a decision needs clarification.

## Demonstration

The demonstration will submit a valid request, retrieve it using the returned reference, update its status as registrar staff, and verify that the student sees the change. The Postman collection will also show a rejected invalid request and a denied update attempted by a student. The browser and Postman will use the same Express API and persistent database.
