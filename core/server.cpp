#pragma GCC optimize("O3,unroll-loops,ofast")
#include <bits/stdc++.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>

using namespace std;

unordered_map<string, string> store;

// process command
string handle(string input) {
    stringstream ss(input);
    string cmd, key, value;

    ss >> cmd;

    if(cmd == "PUT") {
        if(!(ss >> key)) return "ERROR\n";
        getline(ss, value);
        if(!value.empty() && value[0] == ' ') {
            value.erase(0, 1);
        }
        store[key] = value;
        return "OK\n";
    }
    else if(cmd == "GET") {
        if(!(ss >> key)) return "ERROR\n";
        if(store.count(key))
            return store[key] + "\n";
        else
            return "NOT_FOUND\n";
    }

    return "ERROR\n";
}

int main() {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);

    sockaddr_in addr;
    addr.sin_family = AF_INET;
    int port;
    cin >> port;   // read port from input
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = INADDR_ANY;

    bind(server_fd, (sockaddr*)&addr, sizeof(addr));
    listen(server_fd, 5);

    cout << "Server running on port " << port << "...\n";

    while(true) {
        int client = accept(server_fd, NULL, NULL);

        char buffer[1024] = {0};
        read(client, buffer, 1024);

        string response = handle(string(buffer));

        send(client, response.c_str(), response.size(), 0);

        close(client);
    }

    return 0;
}
