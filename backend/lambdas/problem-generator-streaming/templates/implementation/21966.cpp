// BOJ - 21966 (중략)

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    string s; cin >> s;
    if(s.size() <= 25) { cout << s << '\n'; return 0; }

    LOOP(i, 11, s.size() - 12)
        if(s[i] == '.') {
            loop(k, 0, 8) cout << s[k]; cout << "......";
            loop(k, s.size() - 10, s.size() - 1) cout << s[k];
            cout << '\n'; return 0;
        }

    loop(k, 0, 10) cout << s[k]; cout << "...";
    loop(k, s.size() - 11, s.size() - 1) cout << s[k];
    cout << '\n'; return 0;
}