#!/bin/bash -e

# KDB-X Installation Script

RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
BLUE=$(tput setaf 12) # check user system
CYAN=$(tput setaf 208)
BOLD=$(tput bold)
NC=$(tput sgr0)

INSTALL_DIR="$HOME/.kx"
BIN_DIR="$INSTALL_DIR/bin"
Q_DIR="$INSTALL_DIR/q"
LIB_DIR="$INSTALL_DIR/lib"
AI_LIBS_DIR="$INSTALL_DIR/ai-libs"

SCRIPT_DIR="$(dirname $0)"
TEMP_DIR=""

CHANGES_LOG="/tmp/kdb_install_changes_$$.log"
ROLLBACK_REQUIRED=false
ROLLBACK_ITEMS=()
ROLLBACK_ACTIONS=()

B64_LIC=""
OFFLINE_MODE=false

check_args() {
    for arg in "$@"; do
      if [ "$B64_LIC" = "NEXT" ]; then
          B64_LIC="$arg"
          continue
      fi
      case $arg in
        --offline)
          OFFLINE_MODE=true
          ;;
        --b64lic)
          B64_LIC="NEXT"
          ;;
        *)
          print_error "Unknown argument: $arg"
          print_info "Usage: $0 [--online|--offline]"
          exit 1
          ;;
      esac
    done
}

print_header()  { printf "\n-------- %s --------\n" "$1"; }
print_success() { printf "%s%sSuccess: %s%s%s%s\n" "$BOLD" "$GREEN" "$NC" "$GREEN" "$1" "$NC"; }
print_blue()    { printf "%s%s%s\n" "$BLUE" "$1" "$NC"; }
print_green()   { printf "%s%s%s\n" "$GREEN" "$1" "$NC"; }
print_warning() { printf "%sWarning: %s%s\n" "$BOLD" "$NC" "$1"; }
print_error()   { printf "%s%sError: %s%s%s%s\n" "$BOLD" "$RED" "$NC" "$RED" "$1" "$NC"; }
print_info()    { printf "%s\n" "$1"; }

register_change() {
    local action="$1"  # CREATE, MODIFY, COPY, etc.
    local target="$2"  # Path or identifier
    local source="$3"  # Optional source for copy operations

    echo "$(date +"%Y-%m-%d %H:%M:%S") - $action: $target" >> "$CHANGES_LOG"

    ROLLBACK_ITEMS+=("$target")
    ROLLBACK_ACTIONS+=("$action")

    case "$action" in
        CREATE_DIR)
            #
            ;;
        CREATE_FILE)
            #
            ;;
        MODIFY_FILE)
            if [ -f "$target" ] && [ ! -f "${target}.kdb_backup" ]; then
                cp "$target" "${target}.kdb_backup" 2>/dev/null || true
            fi
            ;;
        COPY_FILE)
            #
            ;;
        *)
            #
            ;;
    esac
}

perform_rollback() {
    print_header "Installation failed - Rolling back changes"

    for ((i=${#ROLLBACK_ITEMS[@]}-1; i>=0; i--)); do
        local target="${ROLLBACK_ITEMS[$i]}"
        local action="${ROLLBACK_ACTIONS[$i]}"

        case "$action" in
            CREATE_DIR)
                if [ -d "$target" ]; then
                    print_info "  Removing directory: $target"
                    rm -rf "$target" 2>/dev/null || true
                fi
                ;;
            CREATE_FILE)
                if [ -f "$target" ]; then
                    print_info "  Removing file: $target"
                    rm -f "$target" 2>/dev/null || true
                fi
                ;;
            MODIFY_FILE)
                if [ -f "${target}.kdb_backup" ]; then
                    print_info "  Restoring file: $target"
                    mv "${target}.kdb_backup" "$target" 2>/dev/null || true
                else
                    print_info "  Removing modified file: $target"
                    rm -f "$target" 2>/dev/null || true
                fi
                ;;
            COPY_FILE)
                print_info "  Removing copied file: $target"
                rm -f "$target" 2>/dev/null || true
                ;;
            *)
                # Other actions
                ;;
        esac
    done

    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi

    print_success "Rollback completed - System returned to previous state"

    rm -f "$CHANGES_LOG" 2>/dev/null || true

    exit 1
}

setup_error_trap() {
    trap 'handle_error $?' ERR
    trap cleanup EXIT
}

handle_error() {
    local exit_code=$1

    if [ $exit_code -ne 0 ] && [ "$ROLLBACK_REQUIRED" = true ]; then
        print_error "Error detected during installation (code: $exit_code)"
        perform_rollback
    fi
}

cleanup() {
    if [ $? -eq 0 ]; then
        if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
            rm -rf "$TEMP_DIR" 2>/dev/null || true
        fi

        for ((i=0; i<${#ROLLBACK_ITEMS[@]}; i++)); do
            local target="${ROLLBACK_ITEMS[$i]}"
            local action="${ROLLBACK_ACTIONS[$i]}"

            if [ "$action" = "MODIFY_FILE" ] && [ -f "${target}.kdb_backup" ]; then
                rm -f "${target}.kdb_backup" 2>/dev/null || true
            fi
        done

        rm -f "$CHANGES_LOG" 2>/dev/null || true
    fi
}

check_prerequisites() {
    MISSING_PREREQS=()

    if [ "$OFFLINE_MODE" = false ] && ! command -v curl &> /dev/null; then
        MISSING_PREREQS+=("curl")
    fi

    if ! command -v unzip &> /dev/null; then
        MISSING_PREREQS+=("unzip")
    fi

    if [ ${#MISSING_PREREQS[@]} -gt 0 ]; then
        print_error "Missing prerequisites: ${MISSING_PREREQS[*]}"
        print_info "Please install the required packages and try again"
        exit 1
    fi
}

install_rlwrap() {
    print_header "Checking for rlwrap"
    print_info "rlwrap (readline wrapper) is a utility providing line editing and history"
    print_info "rlwrap improves the usability of programs that accept keyboard input"
    print_info "Installation is optional but enhances the KDB-X interactive experience"

    if command -v rlwrap >/dev/null 2>&1; then
        print_green "rlwrap already installed"
        return 0
    fi

    print_info "rlwrap not found"

    while true; do
        echo
        print_info "Options:"
        print_info "  1. Install rlwrap (requires sudo)"
        print_info "  2. Skip (you can install it later)"
        echo
        read -p "${BLUE}Please select an option [1-2]: " RLWRAP_OPTION
        printf $NC

        case $RLWRAP_OPTION in
            1)
                print_header "Installing rlwrap"

                if [[ "$OSTYPE" == "darwin"* ]]; then

                    if command -v brew >/dev/null 2>&1; then
                        brew install rlwrap || {
                            print_warning "Failed to install rlwrap via Homebrew"
                            print_info "You can install it manually later with: brew install rlwrap"
                        }
                    else
                        print_warning "Homebrew not found"
                        print_info "To install rlwrap on macOS, first install Homebrew from https://brew.sh/"
                        print_info "Then run: brew install rlwrap"
                    fi
                elif [[ -f /etc/debian_version ]]; then
                    # Debian
                    sudo apt-get update && sudo apt-get install -y rlwrap || {
                        print_warning "Failed to install rlwrap via apt-get"
                        print_info "You can install it manually later with: sudo apt-get install rlwrap"
                    }
                elif [[ -f /etc/redhat-release ]] || [[ -f /etc/centos-release ]] || [[ -f /etc/fedora-release ]]; then
                    # Fedora
                    if command -v dnf >/dev/null 2>&1; then
                        sudo dnf install -y rlwrap || {
                            print_warning "Failed to install rlwrap via dnf"
                            print_info "You can install it manually later with: sudo dnf install rlwrap"
                        }
                    else
                        sudo yum install -y rlwrap || {
                            print_warning "Failed to install rlwrap via yum"
                            print_info "You can install it manually later with: sudo yum install rlwrap"
                        }
                    fi
                elif command -v pacman >/dev/null 2>&1; then
                    # Arch
                    sudo pacman -Sy --noconfirm rlwrap || {
                        print_warning "Failed to install rlwrap via pacman"
                        print_info "You can install it manually later with: sudo pacman -S rlwrap"
                    }
                elif command -v zypper >/dev/null 2>&1; then
                    # openSUSE
                    sudo zypper install -y rlwrap || {
                        print_warning "Failed to install rlwrap via zypper"
                        print_info "You can install it manually later with: sudo zypper install rlwrap"
                    }
                elif command -v apk >/dev/null 2>&1; then
                    # Alpine Linux
                    sudo apk add --no-cache rlwrap || {
                        print_warning "Failed to install rlwrap via apk"
                        print_info "You can install it manually later with: sudo apk add rlwrap"
                    }
                else
                    print_warning "Could not detect package manager for automatic installation."
                    print_info "Please install rlwrap manually for your system."
                fi

                if command -v rlwrap >/dev/null 2>&1; then
                    print_success "Installed successfully!"
                else
                    print_warning "Installation may have succeeded but rlwrap is not in PATH yet"
                fi
                ;;
            2)
                echo
                print_info "Skipping rlwrap installation"
                print_info "Note: You can install it later to enhance the KDB-X interactive experience"
                ;;
            *)
                echo
                print_error "Invalid option"
                continue
                ;;
        esac
        break
    done
}

check_if_kdb_q() {
    local q_path="$1"

    local result=$(echo ".z.K" | "$q_path" -q 2>/dev/null | head -n 1 || echo "")

    if [[ "$result" =~ ^[0-9]+\.[0-9]+$ ]]; then
        return 0  # This is kdb
    else
        return 1  # This is not kdb
    fi
}

check_existing_installation() {
    EXISTING_ISSUES=()
    EXISTING_PATHS=()

    QCMD=$(command -v q 2>/dev/null) || QCMD=""
    if [ -n "$QCMD" ]; then
        if check_if_kdb_q "$QCMD"; then
            EXISTING_ISSUES+=("Existing q command found: \"$QCMD\"")
            EXISTING_PATHS+=("$QCMD")
        else
            print_info "Found 'q' command at $QCMD but it's not KX (possibly Amazon Q or another tool)"
        fi
    fi

    if [ -n "$QHOME" ]; then
        EXISTING_ISSUES+=("Existing \$QHOME envvar found: \"$QHOME\"")
        if [ -d "$QHOME" ]; then
            EXISTING_PATHS+=("$QHOME")
        fi
        print_warning "Unsetting existing QHOME variable for this installation"
        unset QHOME
    fi

    if [ -n "$QLIC" ]; then
        EXISTING_ISSUES+=("Existing \$QLIC envvar found: \"$QLIC\"")
        print_warning "Unsetting existing QLIC variable for this installation"
        unset QLIC
    fi

    if [ -n "$QINIT" ]; then
        EXISTING_ISSUES+=("Existing \$QINIT envvar found: \"$QINIT\"")
        print_warning "Unsetting existing QINIT variable for this installation"
        unset QINIT
    fi

}

check_install_dir() {
    if [ -n "$INSTALL_DIR" ]; then
        print_info "Checking installation location: $INSTALL_DIR"
    fi
    if [ -z "$INSTALL_DIR" ]; then
        print_warning "No installation location provided"
        while true; do
            echo
            print_info "Options:"
            print_info "  1. Provide an installation location"
            print_info "  2. Abort installation"
            echo
            read -p "${BLUE}Please select an option [1-2]: " OPTION
            printf $NC
            echo

            case $OPTION in
                1)
                    set_custom_install_location
                    ;;
                2)
                    print_info "Installation aborted by user"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    continue
                    ;;
            esac
            break
        done
    elif [ -e "$INSTALL_DIR" ] && [ ! -d "$INSTALL_DIR" ]; then
        print_warning "File found at installation target: $INSTALL_DIR"
        while true; do
            echo
            print_info "Options:"
            print_info "  1. Install to a different location"
            print_info "  2. Abort installation (you can move/delete file and try again)"
            echo
            read -p "${BLUE}Please select an option [1-2]: " OPTION
            printf $NC
            echo

            case $OPTION in
                1)
                    set_custom_install_location
                    ;;
                2)
                    print_info "Installation aborted by user"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    continue
                    ;;
            esac
            break
        done
    elif [ -d "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
        print_warning "Target installation directory exists and is not empty: $INSTALL_DIR"
        while true; do
            echo
            print_info "Options:"
            print_info "  1. Archive existing directory and continue with installation"
            print_info "  2. Install to a different location"
            print_info "  3. Abort installation"
            echo
            read -p "${BLUE}Please select an option [1-3]: " OPTION
            printf $NC
            echo

            case $OPTION in
                1)
                    archive_existing_installation "$INSTALL_DIR"
                    ;;
                2)
                    set_custom_install_location
                    ;;
                3)
                    print_info "Installation aborted by user"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    continue
                    ;;
            esac
            break
        done
    elif [ ! -e "$INSTALL_DIR" ]; then
        if mkdir -p "$INSTALL_DIR" 2>/dev/null ; then
            register_change "CREATE_DIR" "$INSTALL_DIR"
            confirm_install_dir
        else
            print_warning "Cannot create directory: $INSTALL_DIR"
            while true; do
                echo
                print_info "Options:"
                print_info "  1. Install to a different location"
                print_info "  2. Abort installation (you can check/change permissions and try again)"
                echo
                read -p "${BLUE}Please select an option [1-2]: " OPTION
                printf $NC
                echo

                case $OPTION in
                    1)
                        set_custom_install_location
                        ;;
                    2)
                        print_info "Installation aborted by user"
                        exit 0
                        ;;
                    *)
                        print_error "Invalid option"
                        continue
                        ;;
                esac
                break
            done
        fi
    else # empty directory
        if touch "$INSTALL_DIR/qtest" 2>/dev/null ; then
            rm "$INSTALL_DIR/qtest"
            confirm_install_dir
        else
            print_warning "Cannot write to directory: $INSTALL_DIR"
            while true; do
                echo
                print_info "Options:"
                print_info "  1. Install to a different location"
                print_info "  2. Abort installation (you can check/change permissions and try again)"
                echo
                read -p "${BLUE}Please select an option [1-2]: " OPTION
                printf $NC
                echo

                case $OPTION in
                    1)
                        set_custom_install_location
                        ;;
                    2)
                        print_info "Installation aborted by user"
                        exit 0
                        ;;
                    *)
                        print_error "Invalid option"
                        continue
                        ;;
                esac
                break
            done
        fi
    fi
}

confirm_install_dir() {
    BIN_DIR="$INSTALL_DIR/bin"
    Q_DIR="$INSTALL_DIR/q"
    LIB_DIR="$INSTALL_DIR/lib"
    AI_LIBS_DIR="$INSTALL_DIR/ai-libs"
    print_green "Will install to: $INSTALL_DIR"
}

archive_existing_installation() {
    local target_dir="$1"

    if [ ! -d "$target_dir" ] || [ -z "$(ls -A "$target_dir" 2>/dev/null)" ]; then
        print_info "No non-empty directory to archive at $target_dir"
        return 0
    fi

    ARCHIVE_DATE=$(date +"%Y%m%d_%H%M%S")
    ARCHIVE_NAME="kdb_backup_$ARCHIVE_DATE.tar.gz"

    print_info "Archiving existing installation to $HOME/$ARCHIVE_NAME"

    register_change "CREATE_FILE" "$HOME/$ARCHIVE_NAME"

    (cd "$HOME" && tar -czf "$ARCHIVE_NAME" $(printf '%s\n' "$target_dir" | sed "s|^$HOME/||g")) 2>/dev/null || {
        print_error "Failed to create archive. Trying alternative method"
        tar -czf "$HOME/$ARCHIVE_NAME" -C / $(printf '%s\n' "$target_dir" | sed 's|^/||g') 2>/dev/null || {
            print_error "Failed to create archive with fallback method"
            print_info "Continuing without archiving - you may want to manually backup your existing installation"
            return 1
        }
    }

    register_change "MODIFY_FILE" "$target_dir"
    rm -rf "$target_dir" 2>/dev/null || {
        print_error "Failed to remove existing directory: $target_dir"
        print_error "Please manually remove it and try again"
        exit 1
    }

    if [ -f "$HOME/$ARCHIVE_NAME" ]; then
        print_green "Existing installation archived to $HOME/$ARCHIVE_NAME"
    fi
    print_green "Old installation directory removed"
}

set_custom_install_location() {
    read -p "${BLUE}Please specify a new installation directory: " INSTALL_DIR
    printf $NC
    echo
    if [ -n "$INSTALL_DIR" ]; then
        INSTALL_DIR="${INSTALL_DIR/#~\//$HOME/}"
        case "$INSTALL_DIR" in
            /*) : ;;
            *) INSTALL_DIR="$PWD/$INSTALL_DIR" ;;
        esac
    fi
    check_install_dir
}

detect_platform() {
    print_header "Detecting platform"
    OS=$(uname -s)
    ARCH=$(uname -m)
    PREFIX=

    if [ "${OS}" = "Linux" ]; then
        if [ "${ARCH}" = "x86_64" -o "${ARCH}" = "amd64" ]; then
            PREFIX="l64"
        elif [ "${ARCH}" = "aarch64" -o "${ARCH}" = "arm64" ]; then
            PREFIX="l64arm"
        fi
    elif [ "${OS}" = "Darwin" ]; then
        PREFIX="m64"
    fi

    if [ -z "${PREFIX}" ]; then
        print_error "Unsupported OS+Architecture combination: ${OS}+${ARCH}"
        exit 1
    fi

    print_info "Detected system: ${OS} (${ARCH})"
    print_info "Using platform prefix: ${PREFIX}"
    SHELL_TYPE=$(basename "$SHELL")
}

get_offline_zip_file() {
    local file_type="$1"  # "kdb" or "ai"
    local expected_filename=""
    local script_filename=""
    local target_dir=""
    local actual_path=""
    local actual_name=""
    local attempt=""

    if [ "$file_type" = "ai" ]; then
        print_header "AI libraries - Offline installation"
        expected_filename="$PREFIX-ai.zip"
    else
        print_header "KDB-X - Offline installation"
        expected_filename="$PREFIX.zip"
    fi

    script_filename="$SCRIPT_DIR/$expected_filename"

    while true; do
        if [ -z "$attempt" ]; then
            attempt=1
        else
            echo
            print_info     "Options:"
            print_info     "  1. Try again"

            if [ "$file_type" = "ai" ]; then
                print_info "  2. Skip"
            else
                print_info "  2. Abort installation"
            fi
            echo
            read -p "${BLUE}Please select an option [1-2]: " OPTION
            printf $NC
            echo
            case $OPTION in
                1)
                    ;;
                2)
                    ZIP_PATH=""
                    break
                    ;;
                *)
                    print_error "Invalid option"
                    continue
                    ;;
            esac
        fi
        if [ -f "$script_filename" ]; then
            print_green "File detected: $script_filename."
            ZIP_PATH="$script_filename"
            break
        else
            read -p       "${BLUE}Enter path to $expected_filename: " actual_path
            printf $NC
        fi

        actual_path="$(echo "$actual_path" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        actual_path="${actual_path/#~\//$HOME/}"

        if [ -z "$actual_path" ]; then
            print_error "No path provided"
            continue
        fi

        if [ -d "$actual_path" ]; then

            target_dir="$actual_path"
            ZIP_PATH="$target_dir/$expected_filename"

            if [ ! -f "$ZIP_PATH" ]; then
                print_error "File $expected_filename not found in directory: $target_dir"
                continue
            fi
            break

        elif [ -f "$actual_path" ]; then
            ZIP_PATH="$actual_path"
            actual_name="$(basename "$ZIP_PATH")"

            if [ "$actual_name" != "$expected_filename" ]; then
                print_error "Filename mismatch: expected $expected_filename, got $actual_name"
                continue
            fi
            break

        else
            print_error "Invalid path: $actual_path"
            print_info "Path does not exist or is not accessible"
            continue
        fi

    done

    if [ -n "$ZIP_PATH" ]; then
        print_green "Using file: $ZIP_PATH"

        if [ "$(uname -s)" = "Darwin" ]; then
            print_info "Clearing extended attributes for: $ZIP_PATH"
            xattr -c "$ZIP_PATH"
        fi
    fi
}

download_kdb() {
    if [ "$OFFLINE_MODE" = true ]; then
        get_offline_zip_file "kdb"
        if [ -z "$ZIP_PATH" ]; then
            print_info "Installation aborted by user"
            exit 1
        fi

        TEMP_DIR=$(mktemp -d)
        register_change "CREATE_DIR" "$TEMP_DIR"

        FILENAME="$PREFIX.zip"
        cp "$ZIP_PATH" "$TEMP_DIR/$FILENAME" || {
            print_error "Failed to copy zip file to temporary directory"
            exit 1
        }

        print_success "Using offline KDB-X file successfully!"
    else
        print_header "Downloading KDB-X"
        print_info "Fetching the latest stable version"

        TEMP_DIR=$(mktemp -d)
        cd "$TEMP_DIR"

        FILENAME="$PREFIX.zip"
        FILEURL="https://portal.dl.kx.com/assets/raw/kdb-x/kdb-x/~latest~/$FILENAME"

        print_info "From: $FILEURL"

        register_change "CREATE_DIR" "$TEMP_DIR"

        if ! curl --fail -sLo "$FILENAME" "$FILEURL"; then
            print_error "Download failed. Please check your internet connection or permissions"
            cd - > /dev/null
            exit 1
        fi

        print_success "Downloaded successfully!"
        cd - > /dev/null
    fi
}

install_kdb() {
    print_header "Installing KDB-X"

    register_change "CREATE_DIR" "$BIN_DIR"
    register_change "CREATE_DIR" "$Q_DIR"
    register_change "CREATE_DIR" "$LIB_DIR"

    mkdir -p "$BIN_DIR" "$Q_DIR" "$LIB_DIR"

    print_info "Extracting files"
    unzip -q -o "$TEMP_DIR/$FILENAME" -d "$TEMP_DIR/extracted" || {
        print_error "Failed to extract ZIP file. Please check if the file is valid"
        exit 1
    }

    Q_BINARY=$(find "$TEMP_DIR/extracted" -name "q" -type f -perm -u+x | head -1)

    if [ -z "$Q_BINARY" ]; then
        print_error "Could not find q binary in the extracted files"
        exit 1
    fi

    register_change "COPY_FILE" "$BIN_DIR/q" "$Q_BINARY"

    cp "$Q_BINARY" "$BIN_DIR/" || {
        print_error "Failed to copy q binary to $BIN_DIR"
        exit 1
    }

    for Q_FILE in $(find "$TEMP_DIR/extracted" -name "*.q" -type f); do
        DEST_FILE="$Q_DIR/$(basename "$Q_FILE")"
        register_change "COPY_FILE" "$DEST_FILE" "$Q_FILE"
        cp "$Q_FILE" "$Q_DIR/" 2>/dev/null || true
    done

    print_success "Installed successfully!"
}

test_license() {
    unset QHOME
    unset QLIC

    if echo "exit 0" | "$BIN_DIR/q" -q 2>/dev/null; then
        #print_success "License file valid and working"
        return 0 # success
    fi
    return 1 # fail
}

setup_license() {
    print_header "License setup"
    print_info   "A license file is required to run KDB-X"
    LIC_ATTEMPT=""
    while true; do
        if [ -z "$LIC_ATTEMPT" ]; then
          LIC_ATTEMPT=1
        else
          echo
          print_info "Options:"
          print_info "  1. Try again"
          print_info "  2. Abort installation"
          echo
          read -p "${BLUE}Please select an option [1-2]: " OPTION
          printf $NC
          echo

          case $OPTION in
              1)
                  ;;
              2)
                  print_info "Installation aborted by user"
                  exit 0
                  ;;
              *)
                  print_error "Invalid option"
                  continue
                  ;;
          esac
        fi

        if [ -n "$B64_LIC" ]; then
                print_green "Using --b64lic option:"
                print_info  "$B64_LIC"
            LICENSE_CONTENT="$B64_LIC"
            B64_LIC=""
        else
            print_blue "Paste your base64 encoded license and press Enter:"
            read -r LICENSE_CONTENT
        fi
        if [ -n "$LICENSE_CONTENT" ]; then
            register_change "CREATE_FILE" "$INSTALL_DIR/kc.lic"

            echo "$LICENSE_CONTENT" | base64 -d > "$INSTALL_DIR/kc.lic" 2>/dev/null || {
                    print_error "Failed to decode license"
                continue
            }

            if test_license; then
                print_success "License file valid and working"
                break
            else
                    print_error "License validation failed"
                rm -f "$INSTALL_DIR/kc.lic" 2>/dev/null || true
                continue
            fi
        else
                print_error "No license content provided"
            continue
        fi
    done
}

install_ai_libs() {
    mkdir -p "$AI_LIBS_DIR"
    register_change "CREATE_DIR" "$AI_LIBS_DIR"

    if [ "$OFFLINE_MODE" = true ]; then
        get_offline_zip_file "ai"
        if [ -z "$ZIP_PATH" ]; then
            print_warning "Continuing without AI libraries"
            return 0
        fi
        print_info "Extracting AI libraries"
        unzip -q -o "$ZIP_PATH" -d "$AI_LIBS_DIR" || {
            print_warning "Failed to extract AI libraries. Continuing without AI libraries"
            return 0
        }
        print_success "Installed successfully!"
    else
        AI_FILENAME="$PREFIX-ai.zip"
        AI_FILEURL="https://portal.dl.kx.com/assets/raw/kdb-x/ai-libs/~latest~/$AI_FILENAME"
        print_header "Downloading AI libraries"
        print_info "Fetching the latest stable version"
        print_info "From: $AI_FILEURL"
        if curl --fail -sLo "$TEMP_DIR/ai_$AI_FILENAME" "$AI_FILEURL"; then
            print_header "Installing AI libraries"
            print_info "Extracting files"
            unzip -q -o "$TEMP_DIR/ai_$AI_FILENAME" -d "$AI_LIBS_DIR" || {
                print_warning "Failed to extract AI libraries. Continuing without AI libraries"
                return 0
            }
            print_success "Installed successfully!"
        else
            print_warning "Failed to download AI libraries. Continuing without AI libraries"
            return 0
        fi
    fi
}

check_existing_kdb_config() {
    local config_file="$1"

    if [ ! -f "$config_file" ]; then
        return 1
    fi

    if grep -q "# KDB-X Installation Configuration" "$config_file" &&
       grep -q "# End KDB-X Installation Configuration" "$config_file"; then
        return 0  # Configuration block exists
    fi

    return 1  # No configuration block found
}

get_existing_kdb_config_content() {
    local config_file="$1"
    local content=""

    if [ ! -f "$config_file" ]; then
        return 1
    fi

    content=$(awk '
        /# KDB-X Installation Configuration/ { in_block = 1; next }
        /# End KDB-X Installation Configuration/ { in_block = 0; next }
        in_block { print }
    ' "$config_file")

    echo "$content"
    return 0
}

line_exists_in_config() {
    local content="$1"
    local line_to_check="$2"

    local normalized_content=$(echo "$content" | sed 's/#.*$//' | sed 's/[[:space:]]*$//' | sed 's/^[[:space:]]*//')
    local normalized_line=$(echo "$line_to_check" | sed 's/#.*$//' | sed 's/[[:space:]]*$//' | sed 's/^[[:space:]]*//')

    echo "$normalized_content" | grep -Fxq "$normalized_line"
}

get_missing_config_lines() {
    local config_file="$1"
    local existing_content
    local missing_lines=()

    existing_content=$(get_existing_kdb_config_content "$config_file")

    local path_line_normalized=$(echo "$NEW_PATH_LINE" | sed 's/#.*$//' | sed 's/[[:space:]]*$//' | sed 's/^[[:space:]]*//')
    if ! line_exists_in_config "$existing_content" "$path_line_normalized"; then
        missing_lines+=("$NEW_PATH_LINE")
    fi

    local alias_needs_adding=true
    if [ ${#EXISTING_Q_ALIAS_LINES[@]} -gt 0 ]; then
        local needs_replacement=false
        for line in "${EXISTING_Q_ALIAS_LINES[@]}"; do
            IFS=':' read -r file content <<< "$line"
            if check_alias_needs_replacement "$content"; then
                needs_replacement=true
                break
            fi
        done

        if [ "$needs_replacement" = false ]; then
            alias_needs_adding=false
        fi
    fi

    if [ "$alias_needs_adding" = true ]; then
        local alias_line_normalized=$(echo "$NEW_Q_ALIAS_LINE" | sed 's/#.*$//' | sed 's/[[:space:]]*$//' | sed 's/^[[:space:]]*//')
        if ! line_exists_in_config "$existing_content" "$alias_line_normalized"; then
            missing_lines+=("$NEW_Q_ALIAS_LINE")
        fi
    fi

    if [ ${#EXISTING_QHOME_LINES[@]} -gt 0 ]; then
        local unset_qhome_line
        case "$SHELL_TYPE" in
            fish)
                unset_qhome_line="set -e QHOME"
                ;;
            *)
                unset_qhome_line="unset QHOME"
                ;;
        esac

        if ! line_exists_in_config "$existing_content" "$unset_qhome_line"; then
            missing_lines+=("$unset_qhome_line  # Unset any previous QHOME setting")
        fi
    fi

    if [ ${#EXISTING_QLIC_LINES[@]} -gt 0 ]; then
        local unset_qlic_line
        case "$SHELL_TYPE" in
            fish)
                unset_qlic_line="set -e QLIC"
                ;;
            *)
                unset_qlic_line="unset QLIC"
                ;;
        esac

        if ! line_exists_in_config "$existing_content" "$unset_qlic_line"; then
            missing_lines+=("$unset_qlic_line   # Unset any previous QLIC setting")
        fi
    fi

    if [ ${#EXISTING_QINIT_LINES[@]} -gt 0 ]; then
        local unset_qinit_line
        case "$SHELL_TYPE" in
            fish)
                unset_qinit_line="set -e QINIT"
                ;;
            *)
                unset_qinit_line="unset QINIT"
                ;;
        esac

        if ! line_exists_in_config "$existing_content" "$unset_qinit_line"; then
            missing_lines+=("$unset_qinit_line  # Unset any previous QINIT setting")
        fi
    fi

    for line in "${missing_lines[@]}"; do
        if [ -n "$line" ] && [ "$line" != " " ]; then
            echo "$line"
        fi
    done
}


detect_shell_config() {
    print_header "Detecting shell configuration"

    SHELL_TYPE=""

    if [ -n "$SHELL" ]; then
        SHELL_TYPE=$(basename "$SHELL")
        SHELL_TYPE="${SHELL_TYPE#-}"
    elif [ -n "$PPID" ]; then
        SHELL_TYPE=$(ps -o comm= -p "$PPID" | head -n 1)
        SHELL_TYPE="${SHELL_TYPE#-}"
    fi

    case "$SHELL_TYPE" in
        fish*)
            SHELL_TYPE="fish"
            ;;
        zsh*)
            SHELL_TYPE="zsh"
            ;;
        bash*)
            SHELL_TYPE="bash"
            ;;
        sh|ksh|tcsh|csh|dash)
            SHELL_TYPE="$SHELL_TYPE"
            ;;
        *)
            SHELL_TYPE="unknown"
            ;;
    esac

    print_info "Detected shell: $SHELL_TYPE"

    SHELL_CONFIGS=()
    EXISTING_QHOME_LINES=()
    EXISTING_QLIC_LINES=()
    EXISTING_QINIT_LINES=()  # Added QINIT detection
    EXISTING_PATH_LINES=()
    EXISTING_Q_ALIAS_LINES=()

    case "$SHELL_TYPE" in
        bash)
            if [ -f "$HOME/.bash_profile" ]; then
                SHELL_CONFIGS+=("$HOME/.bash_profile")
            fi
            if [ -f "$HOME/.bashrc" ]; then
                SHELL_CONFIGS+=("$HOME/.bashrc")
            fi
            if [ -f "$HOME/.profile" ]; then
                SHELL_CONFIGS+=("$HOME/.profile")
            fi
            ;;
        zsh)
            if [ -f "$HOME/.zshrc" ]; then
                SHELL_CONFIGS+=("$HOME/.zshrc")
            fi
            if [ -f "$HOME/.zprofile" ]; then
                SHELL_CONFIGS+=("$HOME/.zprofile")
            fi
            ;;
        fish)
            if [ -f "$HOME/.config/fish/config.fish" ]; then
                SHELL_CONFIGS+=("$HOME/.config/fish/config.fish")
            fi
            ;;
        *)
            if [ -f "$HOME/.profile" ]; then
                SHELL_CONFIGS+=("$HOME/.profile")
            fi
            ;;
    esac

    if [ ${#SHELL_CONFIGS[@]} -eq 0 ]; then
        print_warning "No shell configuration files found"
        return 0
    fi

    print_info "Found configuration files:"
    for config in "${SHELL_CONFIGS[@]}"; do
        print_info "  - $config"
    done

    for config in "${SHELL_CONFIGS[@]}"; do
        if [ -f "$config" ]; then
            while IFS= read -r line; do
                trimmed_line="${line%%\#*}"
                trimmed_line="${trimmed_line#"${trimmed_line%%[![:space:]]*}"}"
                if [[ -z "$trimmed_line" ]]; then
                    continue
                fi

                if [[ "$trimmed_line" =~ (export[[:space:]]+QHOME=|^[[:space:]]*QHOME=|set[[:space:]]+-gx[[:space:]]+QHOME) ]]; then
                    EXISTING_QHOME_LINES+=("$config:$line")
                elif [[ "$trimmed_line" =~ (export[[:space:]]+QLIC=|^[[:space:]]*QLIC=|set[[:space:]]+-gx[[:space:]]+QLIC) ]]; then
                    EXISTING_QLIC_LINES+=("$config:$line")
                elif [[ "$trimmed_line" =~ (export[[:space:]]+QINIT=|^[[:space:]]*QINIT=|set[[:space:]]+-gx[[:space:]]+QINIT) ]]; then
                    EXISTING_QINIT_LINES+=("$config:$line")
                elif [[ "$trimmed_line" =~ ^[[:space:]]*alias[[:space:]]+q= ]]; then
                    if [[ "$trimmed_line" =~ (rlwrap|/q[[:space:]]*$|QHOME) ]]; then
                        EXISTING_Q_ALIAS_LINES+=("$config:$line")
                    fi
                fi
            done < "$config"

            while IFS= read -r line; do
                trimmed_line="${line%%\#*}"
                trimmed_line="${trimmed_line#"${trimmed_line%%[![:space:]]*}"}"
                if [[ -z "$trimmed_line" ]]; then
                    continue
                fi

                if [[ "$trimmed_line" =~ PATH.*(q[^[:alnum:]]|kx|QHOME) ]]; then
                    EXISTING_PATH_LINES+=("$config:$line")
                fi
            done < "$config"
        fi
    done

    return 0
}

generate_replacement_lines() {
    RLWRAP_AVAILABLE=false
    if command -v rlwrap >/dev/null 2>&1; then
        RLWRAP_AVAILABLE=true
    fi

    case "$SHELL_TYPE" in
        fish)
            NEW_PATH_LINE="set -gx PATH \"$BIN_DIR\" \$PATH"
            if [ "$RLWRAP_AVAILABLE" = true ]; then
                NEW_Q_ALIAS_LINE="alias q=\"rlwrap -r q\""
            else
                NEW_Q_ALIAS_LINE="# alias q=\"rlwrap -r q\"  # Uncomment after installing rlwrap"
            fi
            ;;
        *)
            NEW_PATH_LINE="export PATH=\"$BIN_DIR:\$PATH\""
            if [ "$RLWRAP_AVAILABLE" = true ]; then
                NEW_Q_ALIAS_LINE="alias q=\"rlwrap -r q\""
            else
                NEW_Q_ALIAS_LINE="# alias q=\"rlwrap -r q\"  # Uncomment after installing rlwrap"
            fi
            ;;
    esac
}

check_alias_needs_replacement() {
    local alias_line="$1"

    if [[ "$alias_line" =~ $BIN_DIR ]] || [[ "$alias_line" =~ $INSTALL_DIR ]]; then
        return 1
    fi

    if [[ "$alias_line" =~ /.*q/.*q ]] || [[ "$alias_line" =~ QHOME.*q ]]; then
        local path_in_alias
        if [[ "$alias_line" =~ QHOME=([^[:space:]]+) ]]; then
            path_in_alias="${BASH_REMATCH[1]}"
        elif [[ "$alias_line" =~ \"([^\"]*q[^\"]*)/[^\"]*\" ]]; then
            path_in_alias="${BASH_REMATCH[1]}"
        elif [[ "$alias_line" =~ ([^[:space:]\"]+q[^[:space:]\"]*)/[^[:space:]\"]*q ]]; then
            path_in_alias="${BASH_REMATCH[1]}"
        fi

        if [[ -n "$path_in_alias" ]] && [[ "$path_in_alias" != "$INSTALL_DIR" ]]; then
            return 0
        fi
    fi

    if [[ "$alias_line" =~ ^[[:space:]]*alias[[:space:]]+q=[[:space:]]*[\"\']*rlwrap[[:space:]]+-r[[:space:]]+q[\"\']*[[:space:]]*$ ]]; then
        return 1
    fi

    return 0
}

create_backup() {
    local file="$1"
    local backup_file="${file}.backup.$(date +%Y%m%d_%H%M%S)"

    if cp "$file" "$backup_file"; then
        print_info "Created backup: $backup_file"
        return 0
    else
        print_error "Failed to create backup of $file"
        return 1
    fi
}

show_configuration_preview() {
    local target_config="$1"
    shift
    local missing_lines=("$@")

    if [ ${#missing_lines[@]} -eq 0 ]; then
        return 0
    fi

    print_header "Configuration changes needed"

    if [ ${#EXISTING_QHOME_LINES[@]} -gt 0 ]; then
        print_info "Existing QHOME lines found (will be unset):"
        for line in "${EXISTING_QHOME_LINES[@]}"; do
            IFS=':' read -r file content <<< "$line"
            print_info "  In $file: $content"
        done
        echo
    fi

    if [ ${#EXISTING_QLIC_LINES[@]} -gt 0 ]; then
        print_info "Existing QLIC lines found (will be unset):"
        for line in "${EXISTING_QLIC_LINES[@]}"; do
            IFS=':' read -r file content <<< "$line"
            print_info "  In $file: $content"
        done
        echo
    fi

    if [ ${#EXISTING_QINIT_LINES[@]} -gt 0 ]; then
        print_info "Existing QINIT lines found (will be unset):"
        for line in "${EXISTING_QINIT_LINES[@]}"; do
            IFS=':' read -r file content <<< "$line"
            print_info "  In $file: $content"
        done
        echo
    fi

    if [ ${#EXISTING_Q_ALIAS_LINES[@]} -gt 0 ]; then
        local needs_replacement=false
        print_info "Existing q alias lines found:"
        for line in "${EXISTING_Q_ALIAS_LINES[@]}"; do
            IFS=':' read -r file content <<< "$line"
            print_info "  In $file: $content"
            if check_alias_needs_replacement "$content"; then
                needs_replacement=true
                print_info "    -> This alias needs replacement (points to different installation)"
            else
                print_info "    -> This alias is already correct"
            fi
        done
        echo
    fi

    print_info "Lines to be ADDED to $target_config:"
    for line in "${missing_lines[@]}"; do
        if [ -n "$line" ]; then
            print_green "    + $line"
        fi
    done
    echo

    print_info "This preserves existing configuration while ensuring the new KDB-X installation takes precedence"
}

apply_configuration_changes() {
    local target_config=""

    if [ ${#SHELL_CONFIGS[@]} -gt 0 ]; then
        target_config="${SHELL_CONFIGS[0]}"
    else
        case "$SHELL_TYPE" in
            bash)
                target_config="$HOME/.bashrc"
                ;;
            zsh)
                target_config="$HOME/.zshrc"
                ;;
            fish)
                target_config="$HOME/.config/fish/config.fish"
                mkdir -p "$(dirname "$target_config")"
                ;;
            *)
                target_config="$HOME/.profile"
                ;;
        esac
    fi

    if [ ! -f "$target_config" ]; then
        mkdir -p "$(dirname "$target_config")"
        touch "$target_config"
    fi

    if [ ! -w "$target_config" ]; then
        print_warning "Cannot write to configuration file: $target_config"
        print_info "Skipping environment setup - manual configuration required"
        print_info "You can run directly using: $BIN_DIR/q"
        print_info ""
        print_info "To set up your environment manually, add these lines to your shell configuration:"
        print_info "  $NEW_PATH_LINE"
        print_info "  $NEW_Q_ALIAS_LINE"
        CONFIG_CHANGE=0
        return 0
    fi

    local missing_lines=()
    if check_existing_kdb_config "$target_config"; then
        while IFS= read -r line; do
            missing_lines+=("$line")
        done < <(get_missing_config_lines "$target_config")
    else
        missing_lines=()

        if [ ${#EXISTING_QHOME_LINES[@]} -gt 0 ]; then
            case "$SHELL_TYPE" in
                fish)
                    missing_lines+=("set -e QHOME  # Unset any previous QHOME setting")
                    ;;
                *)
                    missing_lines+=("unset QHOME  # Unset any previous QHOME setting")
                    ;;
            esac
        fi

        if [ ${#EXISTING_QLIC_LINES[@]} -gt 0 ]; then
            case "$SHELL_TYPE" in
                fish)
                    missing_lines+=("set -e QLIC  # Unset any previous QLIC setting")
                    ;;
                *)
                    missing_lines+=("unset QLIC  # Unset any previous QLIC setting")
                    ;;
            esac
        fi

        if [ ${#EXISTING_QINIT_LINES[@]} -gt 0 ]; then
            case "$SHELL_TYPE" in
                fish)
                    missing_lines+=("set -e QINIT  # Unset any previous QINIT setting")
                    ;;
                *)
                    missing_lines+=("unset QINIT  # Unset any previous QINIT setting")
                    ;;
            esac
        fi

        missing_lines+=("$NEW_PATH_LINE")

        local alias_needs_adding=true
        if [ ${#EXISTING_Q_ALIAS_LINES[@]} -gt 0 ]; then
            local needs_replacement=false
            for line in "${EXISTING_Q_ALIAS_LINES[@]}"; do
                IFS=':' read -r file content <<< "$line"
                if check_alias_needs_replacement "$content"; then
                    needs_replacement=true
                    break
                fi
            done

            if [ "$needs_replacement" = true ]; then
                missing_lines+=("$NEW_Q_ALIAS_LINE  # Redefine q alias for new installation")
            else
                alias_needs_adding=false
            fi
        fi

        if [ "$alias_needs_adding" = true ] && [ ${#EXISTING_Q_ALIAS_LINES[@]} -eq 0 ]; then
            missing_lines+=("$NEW_Q_ALIAS_LINE")
        fi
    fi

    if [ ${#missing_lines[@]} -eq 0 ]; then
        print_info "All required configuration is already present - no changes needed!"
        print_success "Your configuration is complete and up-to-date."
        CONFIG_CHANGE=0
        return 0
    fi

    show_configuration_preview "$target_config" "${missing_lines[@]}"

    while true; do

        echo
        print_info "Options:"
        print_info "  1. Apply these configuration changes now"
        print_info "  2. Skip (manual setup required later)"
        echo
        read -p "${BLUE}Please select an option [1-2]: " ENV_OPTION
        printf $NC
        echo

        case $ENV_OPTION in
            1)
                create_backup "$target_config" || {
                    print_error "Failed to create backup of $target_config"
                    return 1
                }

                local config_header=""
                if check_existing_kdb_config "$target_config"; then
                    config_header="# KDB-X Installation Configuration Update - $(date)"
                else
                    config_header="# KDB-X Installation Configuration - $(date)"
                fi

                {
                    echo ""
                    echo "$config_header"
                    for line in "${missing_lines[@]}"; do
                        echo "$line"
                    done
                    if ! check_existing_kdb_config "$target_config"; then
                        echo "# End KDB-X Installation Configuration"
                    else
                        echo "# End KDB-X Installation Configuration Update"
                    fi
                } >> "$target_config"

                print_success "Configuration changes applied successfully to $target_config"
                register_change "MODIFY_FILE" "$target_config"
                ;;
            2)
                print_warning "Environment setup skipped"
                print_info "You can run directly using: $BIN_DIR/q"
                print_info ""
                print_info "To set up your environment manually, add the configuration lines shown above to your shell configuration"
                print_info "Note: QHOME and QLIC environment variables are no longer needed"
                ;;
            *)
                print_error "Invalid option"
                continue
                ;;
        esac
        break
    done
}

setup_environment() {
    detect_shell_config
    generate_replacement_lines
    apply_configuration_changes
}

verify_installation() {
    print_header "Verifying installation"

    if [ ! -f "$BIN_DIR/q" ] || [ ! -x "$BIN_DIR/q" ]; then
        print_error "Installation verification failed: q binary missing or not executable"
        return 1
    fi

    if [ -f "$INSTALL_DIR/kc.lic" ]; then
        print_info "License file found at $INSTALL_DIR/kc.lic"
        if ! test_license; then
            print_warning "License file exists but may not be working properly"
        else
            print_info "License file valid and working"
        fi
    else
        print_warning "No license file found - you will need to add kc.lic before using KDB-X"
    fi

    if [ -d "$AI_LIBS_DIR" ] && [ -n "$(ls -A "$AI_LIBS_DIR" 2>/dev/null)" ]; then
        print_info "AI libraries installed"
    fi

    if command -v rlwrap >/dev/null 2>&1; then
        print_info "rlwrap available for enhanced KDB-X experience"
    else
        print_info "rlwrap not found - consider installing it for better KDB-X interactive experience"
    fi

    print_success "Installation verified successfully!"
    return 0
}

print_next_steps() {
    print_header "Installation complete"
    print_info "KDB-X has been installed to $INSTALL_DIR with the following structure:"
    print_info "  - $BIN_DIR: executable files (q)"
    print_info "  - $Q_DIR: q libraries/code"
    print_info "  - $LIB_DIR: dynamic libraries (empty, for future use)"
    if [ -d "$AI_LIBS_DIR" ] && [ -n "$(ls -A "$AI_LIBS_DIR" 2>/dev/null)" ]; then
        print_info "  - $AI_LIBS_DIR: AI/ML libraries"
    fi
    print_info "  - $INSTALL_DIR: license file location (kc.lic)"

    print_header "Next steps"

    if [ "$ENV_OPTION" = "1" ] && [ -n "$NEW_PATH_LINE" ]; then
        print_info "To start using 'q' command immediately:"
        print_info ""
        print_info "Reload your shell configuration:"
        case "$SHELL_TYPE" in
            bash)
                if [ -f "$HOME/.bash_profile" ]; then
                    print_blue "    source ~/.bash_profile"
                elif [ -f "$HOME/.bashrc" ]; then
                    print_blue "    source ~/.bashrc"
                else
                    print_blue "    source ~/.profile"
                fi
                ;;
            zsh)
                if [ -f "$HOME/.zshrc" ]; then
                    print_blue "    source ~/.zshrc"
                elif [ -f "$HOME/.zprofile" ]; then
                    print_blue "    source ~/.zprofile"
                else
                    print_blue "    source ~/.profile"
                fi
                ;;
            fish)
                if [ -f "$HOME/.config/fish/config.fish" ]; then
                    print_blue "    source ~/.config/fish/config.fish"
                else
                    print_blue "    source ~/.profile"
                fi
                ;;
            *)
                print_blue "    source ~/.profile"
                ;;
        esac
        print_info "Then you can simply run:"
        print_blue "    q"
    fi

    NEED_TO_UNSET=()
    for issue in "${EXISTING_ISSUES[@]}"; do
        if [[ "$issue" =~ "Existing \$QHOME envvar found:" ]]; then
            NEED_TO_UNSET+=("QHOME")
        elif [[ "$issue" =~ "Existing \$QLIC envvar found:" ]]; then
            NEED_TO_UNSET+=("QLIC")
        fi
    done

    if [ ${#NEED_TO_UNSET[@]} -gt 0 ]; then
        print_warning "Important: You had existing environment variables that need to be unset:"
        print_info "In your current terminal session, run:"
        for var in "${NEED_TO_UNSET[@]}"; do
            print_blue "    unset $var"
        done
        print_info ""
        print_info "These variables are not set in your shell configuration files"
        print_info "However, they may still be set in your current session"
        print_info ""
    fi

    if [ -f "$INSTALL_DIR/kc.lic" ]; then
        print_info "To run your first q program (\"Hello, World!\"):"
        if [ "$ENV_OPTION" = "1" ] || [ "$CONFIG_CHANGE" = "0" ]; then
            print_blue "    q"
        else
            print_blue "    $BIN_DIR/q"
        fi
        print_blue "    q)\"Hello, World!\""
    else
        print_warning "Before using KDB-X, add your license file as: $INSTALL_DIR/kc.lic"
    fi

    if ! command -v rlwrap >/dev/null 2>&1; then
        print_info ""
        print_info "For a better interactive experience, consider installing rlwrap:"
        case "$OSTYPE" in
            darwin*)
                print_info "    brew install rlwrap"
                ;;
            linux*)
                if [ -f /etc/debian_version ]; then
                    print_info "    sudo apt-get install rlwrap"
                elif [ -f /etc/redhat-release ] || [ -f /etc/centos-release ] || [ -f /etc/fedora-release ]; then
                    print_info "    sudo dnf install rlwrap  # or: sudo yum install rlwrap"
                elif command -v pacman >/dev/null 2>&1; then
                    print_info "    sudo pacman -S rlwrap"
                fi
                ;;
        esac
    fi

    print_header "Resources"
    cat << EOF
Documentation: https://code.kx.com/q/
Tutorials: https://code.kx.com/q/learn/
VS Code Plugin: https://marketplace.visualstudio.com/items?itemName=kx.kdb

Stuck? Ask the Community: https://community.kx.com/
EOF
}

main() {
    check_args "$@"
    setup_error_trap
    clear
    print_header "Welcome to the KDB-X installer"
    ROLLBACK_REQUIRED=true
    check_prerequisites
    check_existing_installation
    check_install_dir
    detect_platform
    download_kdb
    install_kdb
    setup_license
    install_ai_libs
    install_rlwrap
    setup_environment
    verify_installation || perform_rollback
    ROLLBACK_REQUIRED=false
    print_next_steps
}
main "$@"
