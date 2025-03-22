// BOJ - 9095 1, 2, 3 더하기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int d[12] = {0, 1, 2, 4};

int solve(int n) {
    if(!n || d[n]) return d[n];
    return d[n] = solve(n - 1) + solve(n - 2) + solve(n - 3);
}

void exec() {
    int n; cin >> n;
    cout << solve(n) << '\n';
}

int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    while(t--) exec();
}