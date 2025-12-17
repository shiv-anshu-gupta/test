# COMTRADE v1 - Flowchart Documentation Index

## 📋 Overview

This documentation contains **30 professional Mermaid flowcharts** extracted from the JSDoc comments in your codebase. The diagrams provide complete visualization of all major system workflows, message flows, and component interactions.

---

## 📁 Documentation Files

### 1. **flowcharts.md** - Core System Flows (Diagrams 1-10)

Contains the foundational architecture and primary workflows:

- ✅ Main Application Initialization (Diagram 1)
- ✅ Channel Lookup & Update Flow (Diagram 2)
- ✅ Child-to-Parent Message Handling (Diagram 3)
- ✅ Channel State Update & Reactive Subscriptions (Diagram 4)
- ✅ Channel Deletion with Array Synchronization (Diagram 5)
- ✅ Channel State Initialization (Diagram 6)
- ✅ Group Update & Persistence (Diagram 7)
- ✅ Digital Chart Rendering with Label Mapping (Diagram 8)
- ✅ Complete Message Handling Switch Statement (Diagram 9)
- ✅ Reactive Subscriber Pattern (Diagram 10)
- ✅ System Architecture Overview (Bonus)

### 2. **flowcharts-advanced.md** - Detailed Technical Flows (Diagrams 11-20)

In-depth technical analysis and complex processes:

- ✅ Detailed Channel Update by Index Flow with Validation (Diagram 11)
- ✅ Array Synchronization in deleteChannelByID (Diagram 12)
- ✅ Complex Message Routing with Fallback Logic (Diagram 13)
- ✅ Group Edit Persistence Complete Lifecycle (Diagram 14)
- ✅ Error Handling & Validation Decision Tree (Diagram 15)
- ✅ Reactive State System - Internal Mechanism (Diagram 16)
- ✅ Full Application Data Flow Architecture (Diagram 17)
- ✅ Channel Property Update Field Mapping (Diagram 18)
- ✅ Error Recovery & Logging Strategy (Diagram 19)
- ✅ Complete Add Channel Flow (Diagram 20)

### 3. **flowcharts-sequences.md** - Message & Sequence Diagrams (Diagrams 21-30)

Detailed sequence diagrams showing component interactions:

- ✅ Complete Message Flow Sequence Diagram (Diagram 21)
- ✅ Group Edit Persistence - Complete Sequence (Diagram 22)
- ✅ Channel Deletion Cascade (Diagram 23)
- ✅ Add Channel Complete Flow (Diagram 24)
- ✅ Reactive State Subscriber Pattern - Detailed (Diagram 25)
- ✅ Error Propagation & Recovery (Diagram 26)
- ✅ Multi-Type Message Handling Router (Diagram 27)
- ✅ State Persistence Architecture (Diagram 28)
- ✅ Channel Lookup Strategy Comparison (Diagram 29)
- ✅ Complete Application Lifecycle (Diagram 30)

---

## 🎯 Key Features of These Flowcharts

### Visual Design

- **Color Coding**: Each node type has distinct colors for easy identification
  - 🟢 Success/Complete states (Green)
  - 🔵 Processing/Active states (Blue)
  - 🟡 Validation/Check states (Yellow/Orange)
  - 🔴 Error/Failure states (Red)
  - 🟣 State mutations (Purple)

### Diagram Types

- **Flowcharts**: Decision trees, process flows, error handling
- **Sequence Diagrams**: Component interactions, message flows, timing
- **State Diagrams**: State transitions, persistence, recovery
- **Architecture Diagrams**: System overview, component relationships

### Technical Accuracy

- ✅ All diagrams based on JSDoc @algorithm sections
- ✅ Reflects actual code implementation
- ✅ Shows error paths and edge cases
- ✅ Includes validation logic
- ✅ Documents performance characteristics (O(n), O(1))

---

## 📊 Diagram Coverage Matrix

| Area                    | Diagrams              | Coverage                                    |
| ----------------------- | --------------------- | ------------------------------------------- |
| **Initialization**      | 1, 6, 30              | Complete app startup flow                   |
| **Channel Management**  | 2, 5, 11, 12, 20, 29  | Lookup, update, delete, add operations      |
| **Message Handling**    | 3, 9, 13, 21, 26      | All callback types and routing              |
| **State Management**    | 4, 10, 16, 17, 25, 28 | Reactive system, subscriptions, persistence |
| **Group Features**      | 7, 14, 22             | Complete group edit workflow                |
| **Chart Rendering**     | 8, 27                 | Visual updates and chart operations         |
| **Error Handling**      | 15, 19, 26            | Validation, recovery, logging               |
| **System Architecture** | 17, 28, 30            | Overall system design                       |

---

## 🔍 How to Use These Diagrams

### For Documentation

1. **In Code Reviews**: Reference diagrams to explain complex flows
2. **In PRs**: Link diagrams to show implementation approach
3. **In Wikis**: Embed diagrams in project documentation
4. **In Presentations**: Use for stakeholder communication

### For Development

1. **Onboarding**: New developers understand system architecture
2. **Debugging**: Trace message flows to identify issues
3. **Refactoring**: Understand dependencies before changes
4. **Testing**: Verify edge cases shown in diagrams

### For Maintenance

1. **Bug Analysis**: Follow diagram to locate root cause
2. **Performance**: Identify critical paths and bottlenecks
3. **Validation**: Check if implementation matches diagram
4. **Planning**: Understand impact of proposed changes

---

## 🎨 Color Scheme Reference

```
Success/Completion (Green)
├─ #C8E6C9 - Light green (success nodes)
├─ #81C784 - Medium green (completion paths)
└─ #2E7D32 - Dark green (success indicators)

Processing/Active (Blue)
├─ #E3F2FD - Light blue (input, data)
├─ #BBDEFB - Medium blue (processing)
├─ #2196F3 - Bright blue (active operations)
└─ #0D47A1 - Dark blue (critical paths)

Validation/Check (Yellow/Orange)
├─ #FFF9C4 - Light yellow (decision points)
├─ #FFE082 - Medium yellow (validation)
├─ #FFE0B2 - Light orange (index operations)
└─ #E65100 - Dark orange (warnings)

State Mutations (Purple)
├─ #F3E5F5 - Light purple (state changes)
├─ #CE93D8 - Medium purple
└─ #6A1B9A - Dark purple (critical mutations)

Error/Failure (Red)
├─ #FFCDD2 - Light red (errors)
├─ #F44336 - Bright red (failures)
└─ #B71C1C - Dark red (critical errors)
```

---

## 📝 Algorithm Extraction

Each diagram is derived from JSDoc @algorithm sections:

### Example: findChannelByID Algorithm

```javascript
/**
 * @algorithm
 * 1. Validate that channelID is provided
 * 2. Search in analog channels:
 *    - Use indexOf on channelState.analog.channelIDs
 *    - If found (index >= 0), return { type: "analog", idx }
 * 3. If not found in analog, search digital channels:
 *    - Use indexOf on channelState.digital.channelIDs
 *    - If found (index >= 0), return { type: "digital", idx }
 * 4. If not found in either array, return null
 */
```

This algorithm is visualized in **Diagram 2** showing the decision logic and return paths.

---

## 🔗 Related Documentation

- **JSDoc Comments**: `src/main.js` - Contains all source algorithms
- **Component Files**: `src/components/*.js` - Implementation details
- **Utils**: `src/utils/*.js` - Helper functions
- **README.md**: Project overview and setup

---

## 📌 Key Workflows Visualized

### Workflow 1: File Loading to Chart Display

```
User Uploads Files
    ↓
Parse CFG & DAT
    ↓
Initialize State
    ↓
Render Charts
    ↓
Ready for Interaction
```

_See Diagram 1 & 30_

### Workflow 2: User Edit to Persisted Change

```
User Edits in Tabulator
    ↓
Send Message to Parent
    ↓
Find Channel & Update
    ↓
Trigger Subscribers
    ↓
Chart Redraws
    ↓
Close Popup (Changes Persist)
    ↓
Reopen Popup (See Changes)
```

_See Diagrams 3, 7, 14, 22_

### Workflow 3: Channel Deletion

```
User Clicks Delete
    ↓
Extract Channel ID & Index
    ↓
Splice All Synchronized Arrays
    ↓
Remove Data Series
    ↓
Trigger Chart Recreation
    ↓
Chart Updates with n-1 Channels
```

_See Diagrams 5, 12, 23_

### Workflow 4: Message Routing

```
Message Arrives
    ↓
Route by Type
    ↓
Extract Payload
    ↓
Perform Lookup (ID or Index)
    ↓
Update State
    ↓
Notify Subscribers
    ↓
Chart Updates
```

_See Diagrams 9, 13, 27_

---

## ✨ Advanced Features Documented

### 1. Reactive State System

- ✅ Subscription registration (Diagram 10, 16, 25)
- ✅ Change detection and path building
- ✅ Subscriber filtering and notification
- ✅ Handler execution

### 2. Message Handling

- ✅ Multiple payload shapes (Diagram 13, 21)
- ✅ Fallback logic and legacy support
- ✅ Validation at each step
- ✅ Error recovery

### 3. Array Synchronization

- ✅ Multi-array splice operations (Diagram 5, 12, 20)
- ✅ Series alignment with data
- ✅ Index offset calculations
- ✅ Bounds checking

### 4. Group Persistence

- ✅ Edit to persistence flow (Diagram 7, 14, 22)
- ✅ 1-based to 0-based index conversion
- ✅ Auto-computed vs persisted groups
- ✅ Reload verification

---

## 🎓 Learning Path

For new developers, follow this diagram sequence:

1. **Start**: Diagram 30 (Application Lifecycle Overview)
2. **Understand**: Diagram 1 (Initialization)
3. **Learn**: Diagrams 2-4 (Core Operations)
4. **Deep Dive**: Diagrams 5-9 (Specific Features)
5. **Advanced**: Diagrams 11-20 (Complex Scenarios)
6. **Sequences**: Diagrams 21-25 (Component Interactions)
7. **Edge Cases**: Diagrams 13, 15, 19, 26 (Error Handling)

---

## 🔧 Maintenance Notes

- **Update Frequency**: Update diagrams when core algorithms change
- **Validation**: Compare diagrams with actual code after major refactors
- **Comments**: Keep JSDoc @algorithm sections in sync with implementation
- **Testing**: Verify edge cases shown in diagrams with test cases

---

## 📞 Support & Questions

- **Unclear Flows?**: Check the corresponding JSDoc comment in source
- **Missing Diagrams?**: Identify and document new algorithms
- **Diagram Improvements?**: Suggest layout or clarity enhancements
- **Code Changes?**: Update diagrams to reflect new implementation

---

**Generated From**: JSDoc comments in `src/main.js` and related components
**Total Diagrams**: 30 professional flowcharts
**Coverage**: All major system workflows and message flows
**Format**: Mermaid Markdown (GitHub-compatible)
**Status**: ✅ Production-Ready Documentation
