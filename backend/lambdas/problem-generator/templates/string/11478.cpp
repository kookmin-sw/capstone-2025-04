// BOJ - 11478 서로 다른 부분 문자열의 개수

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    string ss; cin >> ss;
    set<string> s; int n = ss.size();
    loop(i, 0, n - 1)
        loop(j, 1, n - i)
            s.insert(ss.substr(i, j));
    cout << s.size() << '\n';
}