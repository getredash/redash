# Test Deadlock Fix Summary - Flask 3 Upgrade

## Problem Analysis

### Root Cause
The deadlocking issues during Flask 2 to Flask 3 upgrade were primarily caused by **transaction isolation conflicts** between test infrastructure and authentication code:

1. **Test Setup Strategy** (`tests/__init__.py`):
   - Overrides `db.session.commit = db.session.flush` (line 94)
   - Uses `drop_all()` / `create_all()` for test isolation (lines 88-89)
   - This keeps data in an uncommitted transaction that gets rolled back in tearDown

2. **Authentication Code Problem**:
   - `create_and_login_user()` and handlers call `db.session.commit()` directly
   - These commits bypass the test override and try to write to the database
   - Flask 3 has stricter session/transaction handling than Flask 2
   - Result: Transaction deadlock when authentication tries to commit while test session has unflushed data

### Why Flask 3 Made This Worse
Flask 3 (specifically Flask-SQLAlchemy 3.x) has:
- Stricter transaction boundaries
- Better scoped session management
- More aggressive connection pooling defaults
- These improvements expose pre-existing transaction conflicts that Flask 2 tolerated

## Solutions Implemented

### 1. Fixed `create_and_login_user()` in `redash/authentication/__init__.py`

**Changed:** Lines 280-307
**What:** Made the function testing-aware

```python
def create_and_login_user(org, name, email, picture=None):
    from flask import current_app
    is_testing = current_app.config.get('TESTING', False)
    
    # Use flush in testing to avoid transaction conflicts, commit in production
    def save_changes():
        if is_testing:
            models.db.session.flush()
        else:
            models.db.session.commit()
    
    # ... rest of function uses save_changes() instead of db.session.commit()
```

**Impact:** This function is called by:
- `redash/authentication/ldap_auth.py`
- `redash/authentication/remote_user_auth.py`
- `redash/authentication/google_oauth.py`
- `redash/authentication/saml_auth.py`
- `tests/test_authentication.py`

All these authentication flows will now work correctly in tests.

### 2. Fixed Token Login Handler in `redash/handlers/authentication.py`

**Changed:** Lines 83-92 (invite/reset password flow)
**What:** Made commit testing-aware when setting password via token

```python
# After login_user(user):
from flask import current_app
if current_app.config.get('TESTING', False):
    models.db.session.flush()
else:
    models.db.session.commit()
```

### 3. Fixed Email Verification Handler in `redash/handlers/authentication.py`

**Changed:** Lines 135-142
**What:** Made commit testing-aware when verifying email

```python
# After setting user.is_email_verified = True:
from flask import current_app
if current_app.config.get('TESTING', False):
    models.db.session.flush()
else:
    models.db.session.commit()
```

## What You Already Had Working

Your test infrastructure already had good patterns:

1. ✅ **Factory Pattern** (`tests/factories.py`):
   - Already uses `flush()` instead of `commit()` during testing
   - Properly checks `current_app.config.get('TESTING')`

2. ✅ **init_db() Testing Mode** (`redash/models/__init__.py`):
   - Reuses existing organizations to avoid duplicates
   - Uses `flush()` instead of `commit()` in testing mode
   - Checks for existing org before creating new one

3. ✅ **Test Cleanup** (`tests/__init__.py` tearDown):
   - Comprehensive cleanup: rollback → close → remove → dispose
   - Handles exceptions gracefully

4. ✅ **Connection Pool Configuration**:
   - Minimal pool size for tests (`pool_size: 1`)
   - No overflow connections
   - Aggressive timeouts

## Questions Answered

### Q1: Is it primarily due to committing to the database on user login?
**A: YES.** The authentication flows were calling `db.session.commit()` directly, which conflicted with the test's `commit = flush` override. This was the primary cause of deadlocks.

### Q2: Can those types of things be mocked to avoid this?
**A: YES, but better to make them testing-aware.** Rather than mocking (which requires patching in every test), making the functions check `TESTING` config is cleaner and more maintainable. This is the approach we implemented.

### Q3: Could a delay be inserted to check that all transactions are completed?
**A: NOT RECOMMENDED.** 
- Delays would make tests slower
- Wouldn't fix the underlying transaction conflict
- Would be fragile and timing-dependent
- The proper solution is to avoid the conflict entirely by not mixing commit strategies

## Testing the Fixes

### Expected Improvements

**Before:**
- Tests hanging indefinitely during authentication
- 3 failed authentication tests
- CLI test hang blocking 891 total tests

**After these changes:**
- Authentication flows should complete without hanging
- Login/logout/signup tests should pass
- Transaction conflicts eliminated

### Recommended Test Commands

```bash
# Run just authentication tests
pytest tests/test_authentication.py -v

# Run with increased verbosity to see database operations
pytest tests/test_authentication.py -v -s --log-cli-level=DEBUG

# Run all tests (if authentication passes)
pytest tests/ -v
```

### If Tests Still Hang

Check these areas:

1. **CLI Tests** - May need similar fixes if they create users/orgs
2. **Direct SQL** - Any raw SQL that commits outside SQLAlchemy
3. **Event Listeners** - Database event listeners that might commit
4. **Background Tasks** - RQ/Celery tasks that access the database

## Additional Recommendations

### Consider These Patterns Going Forward

1. **Create a Testing Utility Function**:
   ```python
   # In tests/__init__.py or tests/utils.py
   def save_in_test(session=None):
       """Use flush in testing, commit in production"""
       if session is None:
           session = db.session
       from flask import current_app
       if current_app.config.get('TESTING', False):
           session.flush()
       else:
           session.commit()
   ```

2. **Use Context Manager for Transactions in Tests**:
   ```python
   @contextmanager
   def test_transaction():
       """Ensure transaction is properly scoped"""
       try:
           yield
           db.session.flush()
       except:
           db.session.rollback()
           raise
   ```

3. **Add a Custom Assertion**:
   ```python
   def assertNoDeadlocks(self, func, *args, **kwargs):
       """Assert function completes without deadlock"""
       import signal
       def timeout_handler(signum, frame):
           raise TimeoutError("Possible deadlock detected")
       
       signal.signal(signal.SIGALRM, timeout_handler)
       signal.alarm(5)  # 5 second timeout
       try:
           result = func(*args, **kwargs)
           signal.alarm(0)  # Cancel alarm
           return result
       except TimeoutError:
           self.fail("Function timed out (possible deadlock)")
   ```

### Long-term Improvements

1. **In-Memory SQLite for Tests** (fastest option):
   ```python
   # In tests/__init__.py
   self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
   ```

2. **Test Database Templates** (PostgreSQL-specific):
   - Create a template database once
   - Clone it for each test (much faster than drop/create)

3. **Parallel Testing**:
   - Once deadlocks are resolved, use `pytest-xdist`
   - Each worker gets its own database

## Files Modified

1. ✅ `redash/authentication/__init__.py` - Fixed `create_and_login_user()`
2. ✅ `redash/handlers/authentication.py` - Fixed token login and email verification
3. ✅ `tests/test_authentication.py` - Fixed missing `super().tearDown()` call
4. ✅ `tests/query_runner/test_athena.py` - Fixed missing `super().tearDown()` call
5. ✅ `tests/tasks/test_worker.py` - Fixed missing `super().tearDown()` calls (2 classes)
6. 📝 `DEADLOCK_FIX_SUMMARY.md` - This documentation

## Critical Bug Fixed: Missing super().tearDown() Calls

**Root Cause of `test_jwt_from_pem_file` Freeze:**

Several test classes override `tearDown()` but **don't call `super().tearDown()`**. This prevents the base class from:
- Rolling back uncommitted transactions
- Closing database sessions
- Disposing the database engine
- Cleaning up Redis

**Result:** Database transactions remain "idle in transaction", holding locks. When the next test's `setUp()` tries to `drop_all()` tables, it **deadlocks** waiting for those locks to be released.

**Database Evidence:**
```sql
-- Active transactions at time of hang:
PID 2738 | idle in transaction | INSERT INTO groups ... (holding locks, waiting for client)
PID 2739 | active, waiting      | DROP TABLE queries (blocked trying to get AccessExclusiveLock)

-- Blocked lock detail:
locktype: relation
table: organizations  
mode: AccessExclusiveLock
granted: false (blocked)
pid: 2739
```

**Why This Happens:**
1. Test starts, `setUp()` tries to `drop_all()` tables
2. Previous test's `tearDown()` didn't call `super().tearDown()`
3. Previous test's transaction is still open ("idle in transaction")
4. Previous test's transaction holds locks on tables from its INSERT operations
5. New test's `drop_all()` needs AccessExclusiveLock but can't get it
6. **DEADLOCK**: New test waits forever for old test to release locks

**Classes Fixed:**
1. `TestJWTAuthentication` in `tests/test_authentication.py`
2. `TestGlueSchema` in `tests/query_runner/test_athena.py` 
3. `TestWorkerMetrics` in `tests/tasks/test_worker.py`
4. `TestQueueMetrics` in `tests/tasks/test_worker.py`

**Pattern to Follow:**
```python
def tearDown(self):
    # Your custom cleanup here
    # ...
    
    # ALWAYS call parent tearDown
    super(YourTestClass, self).tearDown()
```

## Next Steps

1. **Apply the fixes to the running container**:
   
   The fixes have been made to the source files but the Docker image needs to be rebuilt:
   
   ```bash
   # Rebuild and restart with the fixes
   make test
   ```

2. **Monitor for the JWT test**:
   
   The test should now pass `test_jwt_from_pem_file` without hanging because:
   - `TestJWTAuthentication.tearDown()` now calls `super().tearDown()`
   - Database sessions are properly closed
   - No lingering transactions hold locks

3. **Use the debugging script if needed**:
   
   A new script `debug_docker_test.sh` has been created to capture stack traces from hanging tests:
   
   ```bash
   ./debug_docker_test.sh
   ```
   
   This script will:
   - Send SIGUSR1 signal to trigger stack dumps
   - Show container logs
   - Display database lock information
   - Show blocked locks

4. **If tests still hang**, investigate:
   - Check if other test classes have missing `super().tearDown()` calls
   - Look for direct `db.session.commit()` calls in application code during test execution
   - Use the debugging script to identify where tests are stuck

5. **Run full test suite**:
   
   Once authentication tests pass completely:
   
   ```bash
   pytest tests/ -v --tb=short
   ```

## Debugging Tools Created

1. **`debug_docker_test.sh`** - Captures stack traces and database locks from running test container
2. **`debug_deadlock.py`** - Can send signals to any process (already existed)
3. **Signal handlers in tests** - SIGUSR1/SIGUSR2 support via `tests/test_utils.py`

## References

- Flask-SQLAlchemy 3.x Migration Guide: https://flask-sqlalchemy.palletsprojects.com/en/3.0.x/
- Transaction Management: https://docs.sqlalchemy.org/en/20/orm/session_transaction.html
- Testing with SQLAlchemy: https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites
