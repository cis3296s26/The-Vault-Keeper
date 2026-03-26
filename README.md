# The Vault Keeper
"The Vault Keeper" is a self-hosted cloud storage platform designed to provide data independence by eliminating 3rd party data mining and providing free customization. This lightweight, open-source solution allows users to securely upload, store, and manage files on a private Linux server.

## How to run
- Ensure at least Python 3.13.1 is installed by running `python --version` in the terminal.
- Change your directory to the project's folder.
- Run the application using the command: python app.py
- Ctrl + left-click the http link from the terminal OR paste the link into your web browser to open the website.

## How to contribute
Follow this project board to know the latest status of the project: https://github.com/orgs/cis3296s26/projects/44 

## How to build
- Repository: Use this github repository: https://github.com/cis3296s26/The-Vault-Keeper
- Branch: The 'main' branch is the most stable release, with a new release posted on github after weekly developments.  
- IDE: Use VS Code or IntelliJ IDEA (PyCharm).
- Additional Libraries: Install the Flask framework by running the command: 'pip install flask'
- For later development: Ensure VirtualBox is installed to create the virtualized Ubuntu Server environment.
- Compile and Run: Run using the 'python app.py' command in the terminal. 
- Expected Outcome: Once the project is up and running, upon the app starting, the SQLite database will initialize to store data and file logs. The local web server will then host the file management interface at the default Flask port. Currently, the link will lead to a display webpage which lets the user know that it's for The Vault Keeper.