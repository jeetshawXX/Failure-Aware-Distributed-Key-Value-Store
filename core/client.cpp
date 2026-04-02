#pragma GCC optimize("O3,unroll-loops,ofast")
#include <bits/stdc++.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

using namespace std;

unordered_map<int, bool> node_alive;

// cluster nodes
vector<int> ports = {8001, 8002, 8003};

// simple hash (sharding)
int get_port(string key) {
    int h = 0;
    for(char c : key) h += c;
    return ports[h % ports.size()];
}

// send request to node
string send_request(string msg, int port) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);

    sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");

    // try connecting
    if(connect(sock, (sockaddr*)&addr, sizeof(addr)) < 0) {
        node_alive[port] = false;
        close(sock);
        return "NODE_DOWN\n";
    }

    node_alive[port] = true;

    send(sock, msg.c_str(), msg.size(), 0);

    char buffer[1024] = {0};
    read(sock, buffer, 1024);

    close(sock);

    return string(buffer);
}

vector<int> get_replicas(string key) {
    int h = 0;
    for(char c : key) h += c;

    int idx = h % ports.size();

    vector<int> replicas;

    // primary node
    replicas.push_back(ports[idx]);

    // next node (wrap around)
    replicas.push_back(ports[(idx + 1) % ports.size()]);

    return replicas;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    for(int p : ports) {
        node_alive[p] = true;
    }

    while(true) {
        string cmd;
        if(!(cin >> cmd)) break;

        if(cmd == "EXIT") break;

        if(cmd == "PUT") {
            string key, value;
            cin >> key;
            getline(cin, value);
            if(!value.empty() && value[0] == ' ') {
                value.erase(0, 1);
            }

            vector<int> replicas = get_replicas(key);
            bool stored = false;

            for(int port : replicas) {
                string res = send_request("PUT " + key + " " + value, port);

                if(res != "NODE_DOWN\n") {
                    stored = true;
                }
            }

            if(stored) {
                cout << "OK\n";
            } else {
                cout << "NODE_DOWN\n";
            }
        }

        else if(cmd == "GET") {
            string key;
            cin >> key;

            vector<int> replicas = get_replicas(key);
            bool found = false;
            bool saw_not_found = false;

            for(int port : replicas) {
                string res = send_request("GET " + key, port);

                if(res == "NODE_DOWN\n") {
                    continue;
                }

                if(res == "NOT_FOUND\n") {
                    saw_not_found = true;
                    continue;
                }

                if(!res.empty()) {
                    cout << res;
                    found = true;
                    break;
                }
            }

            if(!found) {
                if(saw_not_found) {
                    cout << "NOT_FOUND\n";
                } else {
                    cout << "NODE_DOWN\n";
                }
            }
        }
    }

    return 0;
}
