/**
 * createState.test.js
 * 
 * Comprehensive test suite for createState DOM binding features.
 * Tests core functionality, selective RAF updates, and performance.
 */

import { createState, unwrap } from './createState.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function assert(condition, message) {
  if (!condition) {
    testsFailed++;
    results.push(`❌ FAIL: ${message}`);
    console.error(`❌ FAIL: ${message}`);
  } else {
    testsPassed++;
    results.push(`✅ PASS: ${message}`);
    console.log(`✅ PASS: ${message}`);
  }
}

function describe(testName, testFn) {
  console.log(`\n📋 ${testName}`);
  testFn();
}

function it(testCase, testFn) {
  try {
    testFn();
  } catch (e) {
    testsFailed++;
    results.push(`❌ FAIL: ${testCase} - ${e.message}`);
    console.error(`❌ FAIL: ${testCase}:`, e.message);
  }
}

// ============================================================================
// TEST 1: Basic DOM Binding
// ============================================================================

describe('Basic DOM Binding', () => {
  it('should bind state property to DOM textContent', () => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'display';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({ message: 'Hello' });
    state.bindToDOM('message', '#display', { prop: 'textContent' });

    assert(display.textContent === 'Hello', 'Initial binding works');

    state.message = 'World';
    assert(display.textContent === 'World', 'DOM updates on state change');

    document.body.removeChild(container);
  });

  it('should bind state to input value with two-way sync', () => {
    const container = document.createElement('div');
    const input = document.createElement('input');
    input.id = 'nameInput';
    input.type = 'text';
    container.appendChild(input);
    document.body.appendChild(container);

    const state = createState({ name: 'Alice' });
    state.bindToDOM('name', '#nameInput', { twoWay: true });

    assert(input.value === 'Alice', 'Initial value set');

    state.name = 'Bob';
    assert(input.value === 'Bob', 'Input updated from state');

    // Simulate user input
    input.value = 'Charlie';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // RAF batching might delay this, so we need to wait a bit
    setTimeout(() => {
      assert(state.name === 'Charlie', 'State updated from input');
      document.body.removeChild(container);
    }, 50);
  });

  it('should bind state to checkbox', () => {
    const container = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.id = 'checkBox';
    checkbox.type = 'checkbox';
    container.appendChild(checkbox);
    document.body.appendChild(container);

    const state = createState({ isDark: true });
    state.bindToDOM('isDark', '#checkBox', { twoWay: true });

    assert(checkbox.checked === true, 'Initial checkbox state');

    state.isDark = false;
    assert(checkbox.checked === false, 'Checkbox updates on state change');

    document.body.removeChild(container);
  });
});

// ============================================================================
// TEST 2: Selective RAF Updates (Performance Feature)
// ============================================================================

describe('Selective RAF Updates', () => {
  it('should queue DOM updates on RAF with selectiveUpdate=true', (done) => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'rafDisplay';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({ counter: 0 });
    state.bindToDOM('counter', '#rafDisplay', { prop: 'textContent', selectiveUpdate: true });

    assert(display.textContent === '0', 'Initial value');

    // Rapidly change state multiple times
    state.counter = 1;
    state.counter = 2;
    state.counter = 3;

    // With selectiveUpdate, DOM should only update once per RAF frame
    assert(display.textContent === '0', 'DOM not updated immediately (batched)');

    // Wait for RAF to process
    requestAnimationFrame(() => {
      assert(display.textContent === '3', 'DOM updated after RAF with latest value');
      document.body.removeChild(container);
      done?.();
    });
  });

  it('should still support immediate updates without selectiveUpdate', () => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'immediateDisplay';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({ value: 'A' });
    state.bindToDOM('value', '#immediateDisplay', { prop: 'textContent' }); // No selectiveUpdate

    state.value = 'B';
    assert(display.textContent === 'B', 'DOM updated immediately without selectiveUpdate');

    document.body.removeChild(container);
  });

  it('should handle multiple elements with selective updates', (done) => {
    const container = document.createElement('div');
    const label1 = document.createElement('span');
    const label2 = document.createElement('span');
    label1.id = 'label1';
    label2.id = 'label2';
    container.appendChild(label1);
    container.appendChild(label2);
    document.body.appendChild(container);

    const state = createState({ count: 0 });
    
    // Bind same state to multiple elements, all with selectiveUpdate
    state.bindToDOM('count', '#label1', { prop: 'textContent', selectiveUpdate: true });
    state.bindToDOM('count', '#label2', { prop: 'textContent', selectiveUpdate: true });

    state.count = 10;
    state.count = 20;

    assert(label1.textContent === '0' && label2.textContent === '0', 'Not updated yet');

    requestAnimationFrame(() => {
      assert(label1.textContent === '20' && label2.textContent === '20', 'Both updated with latest value');
      document.body.removeChild(container);
      done?.();
    });
  });
});

// ============================================================================
// TEST 3: Attribute Binding
// ============================================================================

describe('Attribute Binding', () => {
  it('should bind state to DOM attribute', () => {
    const container = document.createElement('div');
    const box = document.createElement('div');
    box.id = 'box';
    container.appendChild(box);
    document.body.appendChild(container);

    const state = createState({ username: 'alice' });
    state.bindToDOM('username', '#box', { attr: 'data-user' });

    assert(box.getAttribute('data-user') === 'alice', 'Initial attribute set');

    state.username = 'bob';
    assert(box.getAttribute('data-user') === 'bob', 'Attribute updated');

    document.body.removeChild(container);
  });

  it('should remove attribute when value is null', () => {
    const container = document.createElement('div');
    const box = document.createElement('div');
    box.id = 'box';
    box.setAttribute('data-value', 'test');
    container.appendChild(box);
    document.body.appendChild(container);

    const state = createState({ value: 'test' });
    state.bindToDOM('value', '#box', { attr: 'data-value' });

    state.value = null;
    assert(!box.hasAttribute('data-value'), 'Attribute removed when value is null');

    document.body.removeChild(container);
  });
});

// ============================================================================
// TEST 4: Nested Property Binding
// ============================================================================

describe('Nested Property Binding', () => {
  it('should bind nested state properties using dot notation', () => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'userCity';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({
      user: {
        profile: {
          city: 'Paris'
        }
      }
    });

    state.bindToDOM('user.profile.city', '#userCity', { prop: 'textContent' });

    assert(display.textContent === 'Paris', 'Nested property bound');

    state.user.profile.city = 'London';
    assert(display.textContent === 'London', 'Nested property update reflected');

    document.body.removeChild(container);
  });

  it('should bind nested state properties using array path', () => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'userName';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({
      user: { name: 'Alice' }
    });

    state.bindToDOM(['user', 'name'], '#userName', { prop: 'textContent' });

    assert(display.textContent === 'Alice', 'Array path works');

    state.user.name = 'Bob';
    assert(display.textContent === 'Bob', 'Nested update via array path');

    document.body.removeChild(container);
  });
});

// ============================================================================
// TEST 5: Unbinding
// ============================================================================

describe('Unbinding', () => {
  it('should unbind state from DOM', () => {
    const container = document.createElement('div');
    const display = document.createElement('span');
    display.id = 'unbindTest';
    container.appendChild(display);
    document.body.appendChild(container);

    const state = createState({ value: 'A' });
    const unbind = state.bindToDOM('value', '#unbindTest', { prop: 'textContent' });

    state.value = 'B';
    assert(display.textContent === 'B', 'Initially bound');

    unbind();

    state.value = 'C';
    assert(display.textContent === 'B', 'DOM not updated after unbind');

    document.body.removeChild(container);
  });
});

// ============================================================================
// TEST 6: innerHTML Binding (with selectiveUpdate for performance)
// ============================================================================

describe('innerHTML Binding', () => {
  it('should bind state to innerHTML with selectiveUpdate for performance', (done) => {
    const container = document.createElement('div');
    const box = document.createElement('div');
    box.id = 'htmlBox';
    container.appendChild(box);
    document.body.appendChild(container);

    const state = createState({ html: '<b>Bold</b>' });
    state.bindToDOM('html', '#htmlBox', { prop: 'innerHTML', selectiveUpdate: true });

    assert(box.innerHTML === '<b>Bold</b>', 'Initial innerHTML set');

    // Rapid updates
    state.html = '<i>Italic</i>';
    state.html = '<u>Underline</u>';

    // With selectiveUpdate, should batch
    assert(box.innerHTML === '<b>Bold</b>', 'Not updated immediately');

    requestAnimationFrame(() => {
      assert(box.innerHTML === '<u>Underline</u>', 'Updated with latest HTML');
      document.body.removeChild(container);
      done?.();
    });
  });
});

// ============================================================================
// TEST 7: Subscription Integration
// ============================================================================

describe('Subscription Integration', () => {
  it('should integrate with state subscriptions', () => {
    const state = createState({ value: 0 });
    let changeCount = 0;

    state.subscribe(() => changeCount++);

    state.value = 1;
    state.value = 2;

    // With default batching, changeCount should be 1 or 2 (batched on same RAF frame)
    assert(changeCount >= 1, 'Subscriptions triggered on state change');
  });
});

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('🚀 Starting createState DOM Binding Tests...\n');

  // Run tests sequentially
  await new Promise(resolve => {
    setTimeout(() => {
      describe('Basic DOM Binding', () => {
        const container = document.createElement('div');
        const display = document.createElement('span');
        display.id = 'display';
        container.appendChild(display);
        document.body.appendChild(container);

        const state = createState({ message: 'Hello' });
        state.bindToDOM('message', '#display', { prop: 'textContent' });

        assert(display.textContent === 'Hello', 'Initial binding works');

        state.message = 'World';
        assert(display.textContent === 'World', 'DOM updates on state change');

        document.body.removeChild(container);
      });
      resolve();
    }, 100);
  });

  await new Promise(resolve => {
    setTimeout(() => {
      describe('Selective RAF Updates', () => {
        const container = document.createElement('div');
        const display = document.createElement('span');
        display.id = 'rafDisplay';
        container.appendChild(display);
        document.body.appendChild(container);

        const state = createState({ counter: 0 });
        state.bindToDOM('counter', '#rafDisplay', { prop: 'textContent', selectiveUpdate: true });

        assert(display.textContent === '0', 'Initial value');

        state.counter = 1;
        state.counter = 2;
        state.counter = 3;

        assert(display.textContent === '0', 'DOM not updated immediately (batched)');

        requestAnimationFrame(() => {
          assert(display.textContent === '3', 'DOM updated after RAF with latest value');
          document.body.removeChild(container);
          resolve();
        });
      });
    }, 100);
  });

  await new Promise(resolve => {
    setTimeout(() => {
      describe('Nested Property Binding', () => {
        const container = document.createElement('div');
        const display = document.createElement('span');
        display.id = 'userCity';
        container.appendChild(display);
        document.body.appendChild(container);

        const state = createState({
          user: {
            profile: {
              city: 'Paris'
            }
          }
        });

        state.bindToDOM('user.profile.city', '#userCity', { prop: 'textContent' });

        assert(display.textContent === 'Paris', 'Nested property bound');

        state.user.profile.city = 'London';
        assert(display.textContent === 'London', 'Nested property update reflected');

        document.body.removeChild(container);
        resolve();
      });
    }, 100);
  });

  await new Promise(resolve => {
    setTimeout(() => {
      describe('Unbinding', () => {
        const container = document.createElement('div');
        const display = document.createElement('span');
        display.id = 'unbindTest';
        container.appendChild(display);
        document.body.appendChild(container);

        const state = createState({ value: 'A' });
        const unbind = state.bindToDOM('value', '#unbindTest', { prop: 'textContent' });

        state.value = 'B';
        assert(display.textContent === 'B', 'Initially bound');

        unbind();

        state.value = 'C';
        assert(display.textContent === 'B', 'DOM not updated after unbind');

        document.body.removeChild(container);
        resolve();
      });
    }, 100);
  });

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);
  console.log('='.repeat(70));

  return testsFailed === 0;
}

// Export for use in Node.js/test frameworks
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, assert, describe, it };
}

// Run tests if in browser
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  console.log('DOM tests are ready. Call runAllTests() to execute.');
}
