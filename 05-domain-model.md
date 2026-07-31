# RiskMulator Studio Bible

# Document 05 — Domain Model

**Version:** 0.1
**Status:** Draft
**Depends On:** Documents 00–04

---

# 1. Purpose

This document defines the main business objects used by RiskMulator Studio, their responsibilities, and how they relate to one another.

These objects guide the database schema, internal APIs, UI screens, validation rules, and simulation logic.

---

# 2. Core Domain Objects

The core domain contains:

* User
* Workspace
* Membership
* Role
* Permission
* Scenario
* Scenario Version
* Session
* Participant
* Simulation State
* Action
* Rule
* Event
* Asset
* Objective
* Score
* Notification
* Snapshot
* Audit Entry
* Report
* Plugin

---

# 3. User

A User represents a person who can access RiskMulator Studio.

## Attributes

* user_id
* username
* display_name
* password_hash
* status
* created_at
* updated_at
* last_sign_in_at
* preferences

## Status Values

* Active
* Disabled
* Locked
* Archived

## Relationships

A User:

* may belong to many Workspaces
* may hold different Roles in different Workspaces
* may participate in many Sessions
* may create Scenarios
* may generate Reports
* may create Audit Entries

---

# 4. Workspace

A Workspace represents an organization, department, class, training group, or project.

## Attributes

* workspace_id
* name
* description
* status
* created_at
* updated_at
* settings

## Status Values

* Active
* Archived
* Deleted

## Relationships

A Workspace:

* contains many Users through Memberships
* contains many Scenarios
* contains many Sessions
* contains many Reports
* contains many Audit Entries
* may have many Plugins enabled

---

# 5. Membership

A Membership connects a User to a Workspace.

## Attributes

* membership_id
* workspace_id
* user_id
* status
* joined_at
* updated_at

## Relationships

A Membership:

* belongs to one User
* belongs to one Workspace
* has one or more Roles

---

# 6. Role

A Role groups permissions.

## Core Roles

* Administrator
* Instructor
* Participant
* Observer
* Scenario Designer

## Attributes

* role_id
* name
* description
* system_role
* created_at
* updated_at

## Relationships

A Role:

* has many Permissions
* may be assigned to many Memberships
* may be assigned to Participants inside a Session

---

# 7. Permission

A Permission represents one allowed operation.

## Examples

* scenario.create
* scenario.edit
* session.start
* session.pause
* participant.assign
* report.generate
* plugin.install
* audit.view

## Attributes

* permission_id
* key
* description

## Relationships

A Permission:

* belongs to one or more Roles

---

# 8. Scenario

A Scenario represents a reusable training exercise.

## Attributes

* scenario_id
* workspace_id
* name
* description
* status
* active_version_id
* created_by
* created_at
* updated_at

## Status Values

* Draft
* Validating
* Published
* Archived
* Rejected

## Relationships

A Scenario:

* belongs to one Workspace
* has many Scenario Versions
* may create many Sessions
* may depend on one or more Plugins

---

# 9. Scenario Version

A Scenario Version is an immutable version of a Scenario.

## Attributes

* scenario_version_id
* scenario_id
* version
* schema_version
* author_id
* created_at
* published_at
* checksum
* configuration

## Contains

* participant roles
* starting state
* rules
* events
* assets
* objectives
* scoring configuration
* completion conditions
* failure conditions

## Relationships

A Scenario Version:

* belongs to one Scenario
* may be used by many Sessions
* references many Rules
* references many Events
* references many Assets
* references many Objectives

A published Scenario Version must not be edited.

Changes require a new version.

---

# 10. Session

A Session represents one simulation run.

## Attributes

* session_id
* workspace_id
* scenario_version_id
* name
* status
* seed
* created_by
* created_at
* started_at
* paused_at
* completed_at
* archived_at
* simulation_time
* speed
* configuration

## Status Values

* Created
* Ready
* Running
* Paused
* Completed
* Failed
* Archived

## Relationships

A Session:

* belongs to one Workspace
* uses one Scenario Version
* has many Participants
* has one current Simulation State
* has many Actions
* has many Event Instances
* has many Scores
* has many Snapshots
* has many Audit Entries
* may generate many Reports

---

# 11. Participant

A Participant represents a person or AI actor inside a Session.

## Attributes

* participant_id
* session_id
* user_id
* actor_type
* assigned_role
* display_name
* status
* joined_at
* left_at
* behavior_profile

## Actor Types

* Human
* AI
* Scripted

## Status Values

* Assigned
* Active
* Disconnected
* Removed
* Completed

## Relationships

A Participant:

* belongs to one Session
* may reference one User
* performs many Actions
* receives many Notifications
* may own Assets
* receives Scores
* may have Objectives

---

# 12. Simulation State

Simulation State represents the current state of a running Session.

## Attributes

* state_id
* session_id
* tick_number
* simulation_time
* status
* variables
* checksum
* updated_at

## Contains References To

* participants
* assets
* objectives
* events
* scores
* notifications
* scenario variables

## Relationships

A Simulation State:

* belongs to one Session
* may produce many Snapshots

There must be one authoritative current state per active Session.

---

# 13. Action

An Action represents an attempted operation inside a Session.

## Attributes

* action_id
* session_id
* participant_id
* action_type
* target_type
* target_id
* parameters
* status
* submitted_at
* simulation_time
* processed_at
* result
* rejection_reason

## Status Values

* Queued
* Validating
* Accepted
* Rejected
* Executed
* Failed
* Cancelled

## Relationships

An Action:

* belongs to one Session
* is submitted by one Participant
* may target one or more Assets
* may trigger Rules
* may trigger Events
* may affect Scores
* creates log entries

---

# 14. Rule

A Rule defines a condition, restriction, calculation, or outcome.

## Attributes

* rule_id
* source_type
* source_id
* name
* description
* rule_type
* priority
* condition
* effect
* enabled

## Rule Types

* Validation
* Permission
* Threshold
* Calculation
* Trigger
* Reward
* Penalty
* State Transition

## Relationships

A Rule:

* may belong to a Scenario Version
* may be provided by a Plugin
* may evaluate Actions
* may trigger Events
* may update Assets
* may affect Scores

---

# 15. Event

An Event defines something that can happen during a Session.

## Attributes

* event_id
* source_type
* source_id
* name
* description
* event_type
* trigger
* delay
* recurrence
* probability
* priority
* effect
* visibility
* enabled

## Event Types

* Scheduled
* Random
* Manual
* Rule Triggered
* Participant Triggered
* Cascading

## Relationships

An Event:

* may belong to a Scenario Version
* may be provided by a Plugin
* may depend on Rules
* may affect Assets
* may create Notifications
* may alter Objectives
* may affect Scores

---

# 16. Event Instance

An Event Instance represents one execution of an Event during a Session.

## Attributes

* event_instance_id
* event_id
* session_id
* status
* scheduled_for
* triggered_at
* completed_at
* source_action_id
* result

## Status Values

* Pending
* Triggered
* Completed
* Cancelled
* Failed

---

# 17. Asset

An Asset represents a simulated object or resource.

## Attributes

* asset_id
* session_id
* asset_type
* name
* status
* owner_id
* properties
* visibility
* created_at
* updated_at

## Examples

* Account
* Wallet
* Server
* Device
* Employee
* Vehicle
* Document
* Facility
* Transaction
* Inventory Item

## Relationships

An Asset:

* belongs to one Session
* may be owned by a Participant
* may relate to other Assets
* may be changed by Actions
* may be changed by Events
* may affect Objectives and Scores

---

# 18. Asset Relationship

An Asset Relationship connects two Assets.

## Attributes

* relationship_id
* session_id
* source_asset_id
* target_asset_id
* relationship_type
* properties

## Examples

* owns
* controls
* depends_on
* connected_to
* contains
* assigned_to

---

# 19. Objective

An Objective represents a desired result inside a Session.

## Attributes

* objective_id
* source_type
* source_id
* name
* description
* objective_type
* status
* assigned_to
* conditions
* deadline
* score_value
* hidden

## Objective Types

* Primary
* Secondary
* Optional
* Individual
* Team
* Hidden
* Timed

## Status Values

* Locked
* Active
* Completed
* Failed
* Expired
* Cancelled

## Relationships

An Objective:

* may belong to a Scenario Version
* may be assigned to Participants or teams
* may depend on other Objectives
* may affect Scores

---

# 20. Score

A Score represents a measurable result.

## Attributes

* score_id
* session_id
* participant_id
* team_id
* category
* value
* source_type
* source_id
* reason
* simulation_time
* created_at

## Score Categories

* Objective
* Accuracy
* Speed
* Compliance
* Teamwork
* Recovery
* Bonus
* Penalty

## Relationships

A Score:

* belongs to one Session
* may belong to one Participant
* may belong to one team
* may originate from an Action, Rule, Event, or Objective

---

# 21. Notification

A Notification represents a simulated message or alert.

## Attributes

* notification_id
* session_id
* recipient_id
* channel
* title
* body
* visibility
* status
* created_at
* delivered_at
* read_at

## Channels

* In Application
* Simulated Email
* Simulated Text Message
* Simulated Chat
* Simulated System Alert
* Instructor Announcement

---

# 22. Snapshot

A Snapshot stores the full Session state at one point in time.

## Attributes

* snapshot_id
* session_id
* tick_number
* simulation_time
* state_data
* checksum
* created_at
* snapshot_type

## Snapshot Types

* Automatic
* Manual
* Recovery
* Replay
* Completion

## Relationships

A Snapshot:

* belongs to one Session
* represents one Simulation State

---

# 23. Audit Entry

An Audit Entry records a meaningful operation.

## Attributes

* audit_entry_id
* workspace_id
* session_id
* user_id
* participant_id
* action
* target_type
* target_id
* result
* metadata
* real_time
* simulation_time

Audit Entries are immutable.

---

# 24. Report

A Report represents generated output from simulation data.

## Attributes

* report_id
* workspace_id
* session_id
* report_type
* format
* status
* generated_by
* generated_at
* file_location
* checksum
* configuration

## Report Types

* Participant
* Team
* Instructor
* Compliance
* Scenario
* Audit
* Comparison
* Executive

## Formats

* PDF
* CSV
* JSON

---

# 25. Plugin

A Plugin adds industry-specific functionality.

## Attributes

* plugin_id
* name
* version
* author
* status
* manifest
* permissions
* installation_path
* installed_at
* updated_at
* checksum

## Status Values

* Installed
* Enabled
* Disabled
* Incompatible
* Blocked
* Removed

## A Plugin May Provide

* Asset types
* Action types
* Rules
* Events
* Objectives
* Reports
* AI behaviors
* Scenario templates
* UI components

---

# 26. Plugin Permission

A Plugin Permission defines what a Plugin may access.

## Examples

* simulation.read
* simulation.write
* asset.read
* asset.write
* report.create
* local_file.read_scoped
* local_file.write_scoped

Network access must be disabled by default.

---

# 27. Core Relationships

```text
User
  ↓
Membership
  ↓
Workspace
  ↓
Scenario
  ↓
Scenario Version
  ↓
Session
  ↓
Participant
  ↓
Action
```

```text
Session
  ├── Simulation State
  ├── Participants
  ├── Assets
  ├── Actions
  ├── Event Instances
  ├── Objectives
  ├── Scores
  ├── Notifications
  ├── Snapshots
  ├── Audit Entries
  └── Reports
```

---

# 28. Ownership Rules

* Every Scenario belongs to one Workspace.
* Every Session belongs to one Workspace.
* Every Session uses one immutable Scenario Version.
* Every Participant belongs to one Session.
* Every Action belongs to one Session and one Participant.
* Every Asset belongs to one Session.
* Every Snapshot belongs to one Session.
* Every Report belongs to one Workspace.
* Every Audit Entry belongs to one Workspace.

---

# 29. Immutability Rules

The following records must be immutable after creation:

* Published Scenario Versions
* Executed Actions
* Completed Event Instances
* Score Entries
* Snapshots
* Audit Entries

Corrections must create new records rather than replacing historical records.

---

# 30. Identifier Rules

Every domain object must use a globally unique identifier.

Identifiers must:

* remain stable
* never be reused
* not expose sensitive information
* work without Internet access

---

# 31. Time Rules

The system must distinguish between:

* real time
* simulation time

Every important record must store the correct time type.

Actions, Events, Scores, Notifications, and Audit Entries may store both.

---

# 32. Data Validation Rules

Every object must be validated before storage.

Validation includes:

* required fields
* identifier format
* status transitions
* relationship integrity
* schema compatibility
* plugin compatibility
* permission checks

Invalid objects must not enter the authoritative simulation state.

---

# 33. Deletion Rules

Permanent deletion should be limited.

Preferred behavior:

* archive Users
* archive Workspaces
* archive Scenarios
* archive Sessions
* disable Plugins

Audit Entries and completed Session history must not be silently deleted.

---

# 34. Domain Boundaries

The core platform owns:

* Users
* Workspaces
* Sessions
* Participants
* Actions
* State
* Logs
* Snapshots
* Reports
* Plugin lifecycle

Plugins own:

* industry-specific Asset types
* industry-specific Action types
* industry-specific Rules
* industry-specific Events
* industry-specific Objectives
* industry-specific Reports

Plugins must not redefine core domain objects.

---

# 35. Acceptance Criteria

Document 05 is approved when:

* every major business object is defined
* object relationships are clear
* ownership rules are clear
* immutable records are identified
* plugin boundaries are clear
* real time and simulation time are separated
* the model supports Documents 00–04
* the model can guide the database schema and API contracts

---

# 36. Charter Compliance

* Offline-first: Compliant
* Safety isolation: Compliant
* Reproducibility: Compliant
* Configurability: Compliant
* Auditability: Compliant
* Modularity: Compliant
* Known conflicts: None
