# Next Outliner - *Collaborative Outliner Note-Taking App*

**Next Outliner** is a real-time collaborative outliner note-taking application similar to Workflowy/Dynalist. It supports various block types and provides content isolation and permission management through knowledge bases.

## ✨ Features

- 📝 Multiple Block Types
  - Text blocks
  - Image blocks
  - Math formula blocks
  - Code blocks
  - ...

- 🔐 Knowledge Base Level Access Control
  - Individual password for each knowledge base
  - Admin and Editor role support
  - Data isolation for privacy protection

- 🔄 Real-time Collaboration
  - Real-time synchronization powered by loro
  - Conflict-free concurrent editing
  - Instant updates across all clients


## 🚀 Quick Start

1. Clone the backend repository

  ```bash
  git clone --recurse-submodules git@github.com:Stardusten/next-outliner-backend2.git
  ```

2. Install necessary dependencies

  ```bash
  cd next-outliner-backend2
  pnpm i
  ```

3. Edit configuration file

  Create a configuration file named `config.yml` in the project root directory. The format is as follows:
  
  ```yml
  host: 0.0.0.0 # Listen address
  port: 8081 # Listen port
  # Paths to HTTPS key and certificate files. If HTTPS is not needed, these can be omitted
  https:
    key: /Users/xxx/ssl/ssl.key
    cert: /Users/xxx/ssl/ssl.crt
  # Replace with a randomly generated string
  jwtSecret: "xDH$tkGcuh;C=F#g+X3-kB5t?;L/T5a%wz}ay!G8/6d3mBC.p4j$(y4_HL&:zhD8(%P\
    ;K:q(*1Fxe8q_R9)KZHW+gmn#BhvNJwM:K6Q5e1&x7teFQ{n4y6j4b]u&Ku]qw)YS3R[8m)&=3@Yq\
    iu,)t}J={SU(h9vn[Q*V(8{-G,JHB?ABU/=mzry7qW&.=u*6m?B$j3f_u{!cfe&/9;YwkNag4ZUBv\
    g4A+A%;qr*{QQ}bKt-minm4,x3VUw==2$z"
  logger: true # Whether to print logs
  maxParamLength: 500 # Do not modify
  newKnowledgeBasePathPrefix: /Users/xxx # Path prefix for new knowledge bases
  adminPasswordHash: 2248cfaeb0d22baeaf103d1026573b5e81a7b67838361ccbc9e09242596d92eddee41cc1341784e072057732cda9f455cf06035a43bcf7df63359cb3a249c591
  adminSalt: 62af4b733e9fc7a7809f8fde017c3ae1
  
  # Knowledge base paths, leave empty
  knowledgeBases: []
  ```
  
  The `adminPasswordHash` and `adminSalt` are the password hash and salt values for the administrator account, which need to be generated.
  We provide the `scripts/gen-admin-password.ts` script for this task. Use it as follows:
  
  ```bash
  pnpm run gen-admin-password
  # Please enter password: hello world
  # Salt: 62af4b733e9fc7a7809f8fde017c3ae1
  # Password hash: 2248cfaeb0d22baeaf103d1026573b5e81a7b67838361ccbc9e09242596d92eddee41cc1341784e072057732cda9f455cf06035a43bcf7df63359cb3a249c591
  ```
  
  Put the generated salt value in `adminSalt` and the generated password hash in `adminPasswordHash`.

4. Start the backend service

  ```bash
  pnpm run dev
  ```

5. Open the frontend page

  We have deployed it on GitHub Pages. You can visit https://stardusten.github.io/next-outliner-frontend2/ to use it directly.

6. Create a new knowledge base

  To create a new knowledge base, click "Admin Login" in the bottom left corner, then enter the backend service address and the administrator password you just set to enter the management page. Then click the "Create New Knowledge Base" button in the top right corner to create a new knowledge base. After creation, click "Refresh Knowledge Base List" to check if the creation was successful. After successful creation, click "Logout" in the top right corner.

7. Enter a knowledge base

  Click "Knowledge Base Editor Login", enter the server URL. Then select the knowledge base you just created from the list below, enter the corresponding password for the knowledge base and click login. If everything is normal, you will see the knowledge base editing page.

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

[MIT License](LICENSE)
