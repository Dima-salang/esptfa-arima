Sprint
screenshots
docker

- set up accounts for each student imported
  - set initial username and password for each acc
  - tab for the teacher to see their enrolled class, their accounts and the initial credential detials
    - the acc credentials will be the first letters of their first name and middle name (if available) and the rest of their last name for the username
    - while the password would be their lastname plus a randomly generated 6-character numerical digit
  - set new password at first login for the student or if they have not yet set a new password aside from the default one to ensure that their accs are safe.
  - they are forced to set a new password before they can navigate or access the internals of the site. 
- groups for the analysis tabs
  - teachers are able to add analysis reports to a group
  - teachers are able to see the summary details of an assessment in the group details
    - so if there are three analysis documents in a group, the teacher will be able to see their summary all in one screen and be able to navigate to them.
- also ensure that for the student, if there is already an existing analysis document for their section but they do not have a score their, do not render an infinite loading screen and just say that they do not have any student data for it.


-ADMIN

add teacher privilege to self-enroll students - DONE

- in their interface

remove staff status in admin for editing user details - DONE

rename actual result to post test scores - DONE

post test sys msg in stud perf registry - DONE

students who are succeeding and failing per topic in topic analysis

school logo in the dashboard - DONE

everything in admin for the sub, quarter, topic, - DONE

screenshots of the system

documentation

- agile
- technologies
- instruction

January 3, 2026

- bar chart for topic analysis
- sorting fields

January 2, 2026

- implement csv convenience for importing students and sections for admin - DONE
  - importing logic - DONE
  - csv template - DONE
  - bulk import view - DONE
- implement student view of actual post test scores and analysis - DONE
  - ActualPostTest model - DONE
  - ActualPostTest view - DONE
  - ActualPostTest serializer - DONE
  - interface for teachers to upload actual post test scores - DONE
  - student dashboard for viewing their analysis, predictions, and raw scores, and actual post test scores - DONE
- modify the analysis view to display the students details and not the user details - DONE
