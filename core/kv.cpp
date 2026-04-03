#pragma GCC optimize("O3,unroll-loops,ofast")
#include <bits/stdc++.h>
using namespace std;

unordered_map<string, string> store;
const string FILE_NAME = "data.txt";

// LOAD DATA FROM DISK
void load_data() {
    ifstream file(FILE_NAME);
    if (!file.is_open()) return;

    string k, v;
    while (file >> k >> v) {
        store[k] = v;
    }
    file.close();
}

// SAVE DATA TO DISK
void save_data() {
    ofstream file(FILE_NAME);
    for (auto &p : store) {
        file << p.first << " " << p.second << "\n";
    }
    file.close();
}

// PUT
void put(string k, string v) {
    store[k] = v;
    save_data();
    cout << "OK\n";
}

// GET
void get(string k) {
    if (store.count(k)) cout << store[k] << "\n";
    else cout << "NOT_FOUND\n";
}

// MAIN
int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    load_data(); // 🔥 important

    string cmd;

    while (cin >> cmd) {
        if (cmd == "PUT") {
            string k, v;
            cin >> k >> v;
            put(k, v);
        }
        else if (cmd == "GET") {
            string k;
            cin >> k;
            get(k);
        }
        else if (cmd == "EXIT") {
            break;
        }
    }

    return 0;
}