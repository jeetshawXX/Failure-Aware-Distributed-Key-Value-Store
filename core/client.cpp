#pragma GCC optimize("O3,unroll-loops")

#include <bits/stdc++.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>

using namespace std;

vector<int> ports = {5001, 5002, 5003};

int get_hash(string key) {
    int h = 0;
    for(char c : key) h += c;
    return h;
}

vector<int> get_replicas(string key) {
    int idx = get_hash(key) % ports.size();
    return {ports[idx], ports[(idx + 1) % ports.size()]};
}

string send_request(string msg, int port) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if(sock < 0) return "NODE_DOWN\n";

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if(connect(sock, (sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock);
        return "NODE_DOWN\n";
    }

    send(sock, msg.c_str(), msg.size(), 0);

    char buffer[1024] = {0};
    int n = recv(sock, buffer, sizeof(buffer), 0);

    close(sock);

    if(n <= 0) return "NODE_DOWN\n";
    return string(buffer);
}

void handle_put(string key, string val) {
    auto replicas = get_replicas(key);
    int success = 0;

    for(int port : replicas) {
        string res = send_request("SET " + key + " " + val + "\n", port);
        if(res == "OK\n") success++;
    }

    if(success >= 2)
        cout << "WRITE SUCCESS\n";
    else
        cout << "WRITE FAILED\n";
}

void handle_get(string key) {
    auto replicas = get_replicas(key);

    map<string,int> freq;

    for(int port : replicas) {
        string res = send_request("GET " + key + "\n", port);
        if(res != "NODE_DOWN\n") freq[res]++;
    }

    string best = "";
    int mx = 0;

    for(auto &p : freq) {
        if(p.second > mx) {
            mx = p.second;
            best = p.first;
        }
    }

    if(mx >= 2)
        cout << best;
    else
        cout << "READ FAILED\n";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    string cmd;

    while(cin >> cmd) {
        if(cmd == "PUT") {
            string k, v;
            cin >> k;
            getline(cin, v);
            if(!v.empty() && v[0]==' ') v.erase(0,1);
            handle_put(k, v);
        }
        else if(cmd == "GET") {
            string k;
            cin >> k;
            handle_get(k);
        }
        else if(cmd == "EXIT") break;
    }
}