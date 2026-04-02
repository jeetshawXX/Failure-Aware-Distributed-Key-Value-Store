#pragma GCC optimize("O3,unroll-loops,ofast")
#include <bits/stdc++.h>
using namespace std;

// In-memory KV store
unordered_map<string, string> store;

// PUT operation
void put(string key, string value) {
    store[key] = value;
    cout << "OK\n";
}

// GET operation
void get(string key) {
    if(store.count(key)) {
        cout << store[key] << "\n";
    } else {
        cout << "NOT_FOUND\n";
    }
}

// MAIN DRIVER
int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    string cmd;

    while(cin >> cmd) {
        if(cmd == "PUT") {
            string key, value;
            cin >> key >> value;
            put(key, value);
        }
        else if(cmd == "GET") {
            string key;
            cin >> key;
            get(key);
        }
        else if(cmd == "EXIT") {
            break;
        }
    }

    return 0;
}