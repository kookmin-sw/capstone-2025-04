// BOJ - 16499 동일한 단어 그룹화하기 ( EC#3 - Problem 13 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    set<string> s;
    loop(i, 1, n) {
        string ss; cin >> ss; sort(ss.begin(), ss.end());
        s.insert(ss);
    }
    cout << s.size() << '\n';
}