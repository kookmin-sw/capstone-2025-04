#include <iostream>
#include <string>

using namespace std;


int tc() {
    string s; cin >> s;
    int par = 0;
    for(char ch : s) {
        if(ch == '(') {
            par++;
        }
        else {
            par--;
            if(par < 0) return 0;
        }
    }
    if(par == 0) return 1;
    else return 0;
}
int main() {
    int t; cin >> t;
    while(t--) {
        if(tc()) cout << "YES\n";
        else cout << "NO\n";
    }
}

