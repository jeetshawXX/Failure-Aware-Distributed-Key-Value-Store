#pragma GCC optimize("O3,unroll-loops,ofast")
#include <bits/stdc++.h>
#include <arpa/inet.h>
#include <unistd.h>
using namespace std;

unordered_map<string, string> store;
mutex mtx;

int PORT;
atomic<bool> isLeader(false);

// ---------------- KV ----------------

void put(string k, string v) {
    lock_guard<mutex> lock(mtx);
    store[k] = v;
}

string get(string k) {
    lock_guard<mutex> lock(mtx);
    if (store.count(k)) return store[k];
    return "NOT_FOUND";
}

// ---------------- NETWORK ----------------

string send_req(int port, string msg) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return "FAIL";

    sockaddr_in serv{};
    serv.sin_family = AF_INET;
    serv.sin_port = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &serv.sin_addr);

    if (connect(sock, (sockaddr*)&serv, sizeof(serv)) < 0) {
        close(sock);
        return "FAIL";
    }

    send(sock, msg.c_str(), msg.size(), 0);

    char buf[1024] = {0};
    read(sock, buf, 1024);

    close(sock);
    return string(buf);
}

// ---------------- REPLICATION ----------------

bool replicate(string k, string v) {
    int success = 1;

    if (PORT != 5002)
        if (send_req(5002, "REPL " + k + " " + v) == "OK") success++;

    if (PORT != 5003)
        if (send_req(5003, "REPL " + k + " " + v) == "OK") success++;

    return success >= 2;
}

// ---------------- HANDLE ----------------

void handle(int sock) {
    char buffer[1024] = {0};
    int bytes = read(sock, buffer, 1024);
    if (bytes <= 0) {
        close(sock);
        return;
    }

    string input(buffer);
    stringstream input_stream(input);
    string line;

    while (getline(input_stream, line)) {
        if (line.empty()) continue;

        string cmd, k, v;
        stringstream ss(line);
        ss >> cmd >> k >> v;

        string res;

        if (cmd == "PUT") {
            if (!isLeader) res = "NOT_LEADER\n";
            else {
                put(k, v);
                res = replicate(k, v) ? "WRITE_SUCCESS\n" : "WRITE_FAILED\n";
            }
        }
        else if (cmd == "GET") {
            res = get(k) + "\n";
        }
        else if (cmd == "REPL") {
            put(k, v);
            res = "OK\n";
        }

        send(sock, res.c_str(), res.size(), 0);
    }

    close(sock);
}

// ---------------- MAIN ----------------

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cout << "Usage: ./server <port>\n";
        return 0;
    }

    PORT = stoi(argv[1]);

    if (PORT == 5001) isLeader = true;

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(PORT);

    bind(server_fd, (sockaddr*)&addr, sizeof(addr));
    listen(server_fd, 10);

    cout << "Node running on port " << PORT;
    if (isLeader) cout << " (LEADER)";
    cout << "\n";

    while (true) {
        int sock = accept(server_fd, nullptr, nullptr);
        thread(handle, sock).detach();
    }

    return 0;
}