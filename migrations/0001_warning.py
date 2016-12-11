# This is here just to print a warning for users who use the old Fabric upgrade script.

if __name__ == '__main__':
    warning = "You're using an outdated upgrade script that is running migrations the wrong way. Please upgrade to " \
              "newer version of the script before continuning the upgrade process."
    print "*" * 20
    print warning
    print "*" * 20
    exit(1)
